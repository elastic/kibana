/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isToolUiEvent, isRoundCompleteEvent, getLatestVersion } from '@kbn/agent-builder-common';
import type {
  DashboardAttachmentData,
  PanelAddedEventData,
  PanelsRemovedEventData,
} from '@kbn/dashboard-agent-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
} from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DashboardAttachmentStore } from '../services/attachment_store';
import { createFlyoutConsumer } from '../flyout';

/**
 * Registers the dashboard attachment UI definition, including the icon and label.
 * Returns a cleanup function that should be called when the plugin stops.
 */
export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  chat$,
  share,
  core,
}: {
  attachments: AttachmentServiceStartContract;
  chat$: Observable<ChatEvent>;
  share?: SharePluginStart;
  core: CoreStart;
}): (() => void) => {
  const attachmentStore = new DashboardAttachmentStore();

  // Create flyout consumer - it subscribes to attachmentStore.state$
  const unsubscribeFlyout = createFlyoutConsumer({ attachmentStore, core, chat$, share });

  attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    onClick: ({ attachment }) => {
      const data = attachment.data;
      if (!data) return;

      attachmentStore.setAttachment(attachment.id, data);
    },
  });

  // Subscribe to chat events for progressive panel updates
  const eventsSubscription = chat$.subscribe((event) => {
    // Handle progressive panel additions
    if (
      isToolUiEvent<typeof DASHBOARD_PANEL_ADDED_EVENT, PanelAddedEventData>(
        event,
        DASHBOARD_PANEL_ADDED_EVENT
      )
    ) {
      const { dashboardAttachmentId, panel } = event.data.data;
      attachmentStore.addPanel(dashboardAttachmentId, panel);
    }

    // Handle progressive panel removals
    if (
      isToolUiEvent<typeof DASHBOARD_PANELS_REMOVED_EVENT, PanelsRemovedEventData>(
        event,
        DASHBOARD_PANELS_REMOVED_EVENT
      )
    ) {
      const { dashboardAttachmentId, panelIds } = event.data.data;
      attachmentStore.removePanels(dashboardAttachmentId, panelIds);
    }

    // Handle final attachment update (round complete)
    if (isRoundCompleteEvent(event) && event.data.attachments) {
      for (const attachment of event.data.attachments) {
        if (attachment.type === DASHBOARD_ATTACHMENT_TYPE) {
          const latestVersion = getLatestVersion(attachment);
          if (latestVersion?.data) {
            attachmentStore.updateAttachment(
              attachment.id,
              latestVersion.data as DashboardAttachmentData
            );
          }
        }
      }
    }
  });

  return () => {
    eventsSubscription.unsubscribe();
    unsubscribeFlyout();
  };
};
