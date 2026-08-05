/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  attachmentDataToDashboardState,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { renderHiddenDashboard } from './render_hidden_dashboard';
import { waitForRenderComplete } from './wait_for_render_complete';
import { captureNodeAsJpeg } from './capture_node';

/**
 * Render + readiness budget. Must stay below the 30s browser tool handler timeout,
 * leaving headroom for the JPEG encoding passes.
 */
const RENDER_TIMEOUT_MS = 20_000;

/** Result shape expected by the server-side `result_type: 'image'` extraction. */
export interface CaptureDashboardScreenshotResult {
  content: string;
  mime_type: 'image/jpeg';
  filename: string;
  /** Stable key so re-captures of the same dashboard update one attachment in place. */
  image_attachment_key: string;
  /** Surfaced to the model when the capture is usable but possibly incomplete. */
  capture_warning?: string;
}

type DashboardWidget = NonNullable<DashboardState['panels']>[number];
type DashboardSectionWidget = Extract<DashboardWidget, { panels: unknown }>;

// Same discriminator as the dashboard plugin's `isDashboardSection` (not exported publicly).
const isSectionWidget = (widget: DashboardWidget): widget is DashboardSectionWidget =>
  'panels' in widget;

/** Panels that will actually render: top-level panels plus panels of expanded sections. */
const countRenderablePanels = (state: DashboardState): number =>
  (state.panels ?? []).reduce((count, widget) => {
    if (isSectionWidget(widget)) {
      return widget.collapsed ? count : count + widget.panels.length;
    }
    return count + 1;
  }, 0);

export const captureDashboardScreenshot = async ({
  core,
  conversationId,
  dashboardAttachmentId,
}: {
  core: CoreStart;
  conversationId: string;
  dashboardAttachmentId: string;
}): Promise<CaptureDashboardScreenshotResult> => {
  // TODO: Fetched from the server rather than read from the conversation UI state: the client
  // only learns about attachments on `round_complete`, while this handler runs on the
  // earlier `prompt_request` event — an attachment created in the same round (the primary
  // generate → capture flow) may not be in the client cache yet. The persisted conversation
  // is always at least as fresh. (Public attachments route; no single-attachment GET today.)
  const { results } = await core.http.get<{ results: VersionedAttachment[] }>(
    `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}/attachments`
  );

  const attachment = results.find(({ id }) => id === dashboardAttachmentId);
  if (!attachment) {
    throw new Error(`Dashboard attachment '${dashboardAttachmentId}' was not found.`);
  }
  if (attachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
    throw new Error(
      `Attachment '${dashboardAttachmentId}' is of type '${attachment.type}', not a dashboard.`
    );
  }

  const latestVersion = getLatestVersion(attachment);
  if (!latestVersion) {
    throw new Error(`Dashboard attachment '${dashboardAttachmentId}' has no content.`);
  }

  const dashboardState = attachmentDataToDashboardState(
    latestVersion.data as DashboardAttachmentData
  );
  const expectedPanels = countRenderablePanels(dashboardState);
  if (expectedPanels === 0) {
    throw new Error('The dashboard has no renderable panels to capture.');
  }

  const { container, cleanup } = renderHiddenDashboard({ core, dashboardState });
  try {
    const waitResult = await waitForRenderComplete({
      container,
      expectedPanels,
      timeoutMs: RENDER_TIMEOUT_MS,
    });

    if (waitResult.timedOut && waitResult.renderedPanels === 0) {
      throw new Error(
        `The dashboard did not render within ${RENDER_TIMEOUT_MS / 1000}s; no panels completed.`
      );
    }

    const captureNode = container.querySelector<HTMLElement>('.dashboardViewport') ?? container;
    const content = await captureNodeAsJpeg(captureNode);

    return {
      content,
      mime_type: 'image/jpeg',
      filename: `dashboard-${dashboardAttachmentId}.jpg`,
      image_attachment_key: `screenshot:${dashboardAttachmentId}`,
      ...(waitResult.timedOut
        ? {
            capture_warning: `Only ${waitResult.renderedPanels} of ${
              waitResult.expectedPanels
            } panels finished rendering within ${
              RENDER_TIMEOUT_MS / 1000
            }s; the screenshot may show incomplete panels.`,
          }
        : {}),
    };
  } finally {
    cleanup();
  }
};
