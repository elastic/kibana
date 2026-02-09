/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { isToolUiEvent } from '@kbn/agent-builder-common/chat';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type DashboardAttachmentData,
  type PanelAddedEventData,
  type PanelRemovedEventData,
} from '@kbn/dashboard-agent-common';
import type {
  DashboardAgentPluginPublicSetup,
  DashboardAgentPluginPublicStart,
  DashboardAgentPluginPublicSetupDependencies,
  DashboardAgentPluginPublicStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';
import { AttachmentStore } from './services/attachment_store';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginPublicSetup,
      DashboardAgentPluginPublicStart,
      DashboardAgentPluginPublicSetupDependencies,
      DashboardAgentPluginPublicStartDependencies
    >
{
  private eventsSubscription?: Subscription;
  private readonly attachmentStore = new AttachmentStore();

  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<DashboardAgentPluginPublicStartDependencies, DashboardAgentPluginPublicStart>,
    _plugins: DashboardAgentPluginPublicSetupDependencies
  ): DashboardAgentPluginPublicSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: DashboardAgentPluginPublicStartDependencies
  ): DashboardAgentPluginPublicStart {
    registerDashboardAttachmentUiDefinition({
      attachments: plugins.agentBuilder.attachments,
      attachmentStore: this.attachmentStore,
      chat$: plugins.agentBuilder.events.chat$,
      share: plugins.share,
      core,
    });

    this.eventsSubscription = plugins.agentBuilder.events.chat$.subscribe((event) => {
      // Handle progressive panel additions
      if (isToolUiEvent<typeof DASHBOARD_PANEL_ADDED_EVENT, PanelAddedEventData>(event, DASHBOARD_PANEL_ADDED_EVENT)) {
        const { dashboardAttachmentId, panel } = event.data.data;
        this.attachmentStore.addPanel(dashboardAttachmentId, panel);
      }

      // Handle progressive panel removals
      if (isToolUiEvent<typeof DASHBOARD_PANEL_REMOVED_EVENT, PanelRemovedEventData>(event, DASHBOARD_PANEL_REMOVED_EVENT)) {
        const { dashboardAttachmentId, panelId } = event.data.data;
        this.attachmentStore.removePanel(dashboardAttachmentId, panelId);
      }

      // Handle final attachment update (round complete)
      if (isRoundCompleteEvent(event) && event.data.attachments) {
        for (const attachment of event.data.attachments) {
          if (attachment.type === DASHBOARD_ATTACHMENT_TYPE) {
            const latestVersion = getLatestVersion(attachment);
            if (latestVersion?.data) {
              this.attachmentStore.updateAttachment(
                attachment.id,
                latestVersion.data as DashboardAttachmentData
              );
            } else {
            }
          }
        }
      }
    });

    return {};
  }

  public stop() {
    this.eventsSubscription?.unsubscribe();
  }
}
