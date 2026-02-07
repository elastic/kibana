/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE, type DashboardAttachmentData } from '@kbn/dashboard-agent-common';
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
      share: plugins.share,
      core,
    });

    this.eventsSubscription = plugins.agentBuilder.events.chat$.subscribe((event) => {
      if (isRoundCompleteEvent(event) && event.data.attachments) {
        // Find dashboard attachments and update the store
        for (const attachment of event.data.attachments) {
          if (attachment.type === DASHBOARD_ATTACHMENT_TYPE) {
            console.log('Dashboard attachment updated:', attachment);
            this.attachmentStore.updateAttachment(
              attachment.id,
              attachment.data as DashboardAttachmentData
            );
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
