/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { SignalInvestigationConfig } from '../common/config';
import { createDiscoverInvestigationFeature } from './actions/discover_investigation_feature';
import type { ChartMetricOption } from './actions/lens_seed_extractor';
import { createActiveSpaceState } from './actions/space_compatibility';
import {
  type SignalInvestigationShownPayload,
  registerShownTelemetryEvent,
  reportSignalInvestigationShown,
  setSignalInvestigationAnalytics,
} from './telemetry/shown_telemetry';

export type SignalInvestigationPublicSetup = Record<string, never>;

export interface OpenInvestigationOptions {
  seed: InvestigationSeed;
  session: 'start' | 'inherit';
  metricOptions?: readonly ChartMetricOption[];
  metricUnreadable?: boolean;
}

export interface SignalInvestigationPublicStart {
  chartActionEnabled: boolean;
  openInvestigation: (options: OpenInvestigationOptions) => Promise<void>;
  reportShown?: (payload: SignalInvestigationShownPayload) => void;
}

interface SignalInvestigationPublicSetupDeps {
  uiActions: UiActionsSetup;
}

interface SignalInvestigationPublicStartDeps {
  agentBuilder?: AgentBuilderPluginStart;
  data: DataPublicPluginStart;
  discoverShared: DiscoverSharedPublicStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
}

export class SignalInvestigationPublicPlugin
  implements
    Plugin<
      SignalInvestigationPublicSetup,
      SignalInvestigationPublicStart,
      SignalInvestigationPublicSetupDeps,
      SignalInvestigationPublicStartDeps
    >
{
  private readonly chartActionEnabled: boolean;
  private currentAppId: string | undefined;
  private isCompatibleSpace: () => boolean = () => false;

  constructor(initContext: PluginInitializerContext<SignalInvestigationConfig>) {
    this.chartActionEnabled = initContext.config.get().chartAction.enabled;
  }

  public setup(
    core: CoreSetup<SignalInvestigationPublicStartDeps, SignalInvestigationPublicStart>,
    plugins: SignalInvestigationPublicSetupDeps
  ): SignalInvestigationPublicSetup {
    setSignalInvestigationAnalytics(core.analytics);
    registerShownTelemetryEvent(core.analytics);

    const getServices = async () => {
      const [, startPlugins, self] = await core.getStartServices();
      return {
        lens: startPlugins.lens,
        licensing: startPlugins.licensing,
        openInvestigation: self.openInvestigation,
      };
    };

    const actionDeps = {
      chartActionEnabled: this.chartActionEnabled,
      isCompatibleSpace: () => this.isCompatibleSpace(),
      getCurrentAppId: () => this.currentAppId,
      getServices,
    };

    plugins.uiActions.addTriggerActionAsync(
      ON_OPEN_PANEL_MENU,
      'signal-investigation-panel-action',
      async () => {
        const { createFindRelatedChangesPanelAction } = await import('./actions/chart_actions');
        return createFindRelatedChangesPanelAction(actionDeps);
      }
    );

    if (this.chartActionEnabled) {
      plugins.uiActions.addTriggerActionAsync(
        ON_APPLY_FILTER,
        'signal-investigation-chart-action',
        async () => {
          const { createFindRelatedChangesChartAction } = await import('./actions/chart_actions');
          return createFindRelatedChangesChartAction(actionDeps);
        }
      );
    }

    return {};
  }

  public start(
    core: CoreStart,
    plugins: SignalInvestigationPublicStartDeps
  ): SignalInvestigationPublicStart {
    setSignalInvestigationAnalytics(undefined, core.analytics);
    const spaceState = createActiveSpaceState(plugins.spaces);
    this.isCompatibleSpace = spaceState.isCompatibleSpace;
    core.application.currentAppId$.subscribe((appId) => {
      this.currentAppId = appId;
    });

    const openInvestigation = async ({
      seed,
      session,
      metricOptions,
      metricUnreadable,
    }: OpenInvestigationOptions): Promise<void> => {
      const { openInvestigationFlyout } = await import('./flyout/investigation_flyout');
      openInvestigationFlyout({
        core,
        data: plugins.data,
        share: plugins.share,
        licensing: plugins.licensing,
        agentBuilder: plugins.agentBuilder,
        seed,
        session,
        metricOptions,
        metricUnreadable,
      });
    };

    const discoverFeature = createDiscoverInvestigationFeature({
      licensing: plugins.licensing,
      openInvestigation,
      currentAppId$: core.application.currentAppId$,
    });
    plugins.discoverShared.features.registry.register(discoverFeature);

    return {
      chartActionEnabled: this.chartActionEnabled,
      openInvestigation,
      reportShown: (payload) => reportSignalInvestigationShown(payload, core.analytics),
    };
  }
}
