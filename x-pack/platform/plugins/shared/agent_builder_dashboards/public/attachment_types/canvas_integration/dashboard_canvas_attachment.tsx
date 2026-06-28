/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { ActionButton, AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
<<<<<<< HEAD:x-pack/platform/plugins/shared/agent_builder_dashboards/public/attachment_types/canvas_integration/dashboard_canvas_attachment.tsx
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
=======
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
>>>>>>> 9.4:x-pack/platform/plugins/shared/dashboard_agent/public/attachment_types/canvas_integration/dashboard_canvas_attachment.tsx
import { DashboardCanvasContent } from './dashboard_canvas_content';
import {
  DashboardPreviewErrorCallout,
  DashboardRendererErrorBoundary,
} from './dashboard_renderer_error_boundary';

export type DashboardCanvasAttachmentProps = AttachmentRenderProps<DashboardAttachment> & {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  closeCanvas: () => void;
  dashboardLocator?: DashboardRendererProps['locator'];
  openSidebarConversation?: () => void;
  searchBarComponent: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
<<<<<<< HEAD:x-pack/platform/plugins/shared/agent_builder_dashboards/public/attachment_types/canvas_integration/dashboard_canvas_attachment.tsx
  data: DataPublicPluginStart;
=======
  filterManager: DataPublicPluginStart['query']['filterManager'];
>>>>>>> 9.4:x-pack/platform/plugins/shared/dashboard_agent/public/attachment_types/canvas_integration/dashboard_canvas_attachment.tsx
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  canWriteDashboards: boolean;
};

export const DashboardCanvasAttachment = (props: DashboardCanvasAttachmentProps) => {
  const { attachment } = props;

  const dashboardState = useMemo(() => {
    try {
      return attachmentDataToDashboardState(attachment.data);
    } catch {
      return undefined;
    }
  }, [attachment.data]);

  if (!dashboardState) {
    return (
      <div css={rootStyles}>
        <DashboardPreviewErrorCallout />
      </div>
    );
  }

  return (
    <div css={rootStyles}>
      <DashboardRendererErrorBoundary resetKey={attachment.data}>
        <DashboardCanvasContent {...props} dashboardState={dashboardState} />
      </DashboardRendererErrorBoundary>
    </div>
  );
};

const rootStyles = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 400,
});
