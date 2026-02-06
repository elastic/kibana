/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { isToolUiEvent } from '@kbn/agent-builder-common/chat/events';
import type { Subscription } from 'rxjs';
import { DASHBOARD_EVENTS, type DashboardSessionCreatedData } from '../common';
import type {
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
} from './types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  private subscription?: Subscription;
  private flyoutCloseRef?: { close: () => void };

  setup(
    core: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    deps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    return {};
  }

  start(core: CoreStart, deps: DashboardAgentStartDependencies): DashboardAgentPluginStart {
    const { agentBuilder } = deps;

    // Subscribe to chat events and open flyout when dashboard session starts
    this.subscription = agentBuilder.events.chat$.subscribe(async (event) => {
      if (
        isToolUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>(
          event,
          DASHBOARD_EVENTS.SESSION_CREATED
        )
      ) {
        const { openDashboardPreviewFlyout } = await import(
          './components/dashboard_preview_flyout'
        );

        this.flyoutCloseRef?.close();

        this.flyoutCloseRef = openDashboardPreviewFlyout({
          core,
          events$: agentBuilder.events.chat$,
          initialEvent: event,
        });
      }
    });

    return {};
  }

  stop() {
    this.subscription?.unsubscribe();
    this.flyoutCloseRef?.close();
  }
}
