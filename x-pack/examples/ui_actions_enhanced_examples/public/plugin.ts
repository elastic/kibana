/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import {
  UiActionsEnhancedMemoryActionStorage,
  UiActionsEnhancedDynamicActionManager,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DashboardHelloWorldDrilldown } from './drilldowns/dashboard_hello_world_drilldown';
import { DashboardToDiscoverDrilldown } from './drilldowns/dashboard_to_discover_drilldown';
import { App1ToDashboardDrilldown } from './drilldowns/app1_to_dashboard_drilldown';
import { App1HelloWorldDrilldown } from './drilldowns/app1_hello_world_drilldown';
import { DashboardHelloWorldOnlyRangeSelectDrilldown } from './drilldowns/dashboard_hello_world_only_range_select_drilldown';
import {
  sampleApp1ClickTrigger,
  sampleApp2ClickTrigger,
  SAMPLE_APP2_CLICK_TRIGGER,
} from './triggers';
import { mount } from './mount';
import { App2ToDashboardDrilldown } from './drilldowns/app2_to_dashboard_drilldown';
import { registerButtonEmbeddable } from './embeddables/register_button_embeddable';

export interface SetupDependencies {
  data: DataPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
  discover: DiscoverSetup;
  embeddable: EmbeddableSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  share: SharePluginStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

export interface UiActionsEnhancedExamplesStart {
  managerWithoutEmbeddable: UiActionsEnhancedDynamicActionManager;
  managerWithoutEmbeddableSingleButton: UiActionsEnhancedDynamicActionManager;
  managerWithEmbeddable: UiActionsEnhancedDynamicActionManager;
}
export const SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_CREATE =
  'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_CREATE';
export const SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_MANAGE =
  'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_MANAGE';
export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, UiActionsEnhancedExamplesStart, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies, UiActionsEnhancedExamplesStart>,
    { embeddable, uiActionsEnhanced: uiActions, developerExamples }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    uiActions.registerDrilldown(new DashboardHelloWorldDrilldown());
    uiActions.registerDrilldown(new DashboardHelloWorldOnlyRangeSelectDrilldown());
    uiActions.registerDrilldown(new DashboardToDiscoverDrilldown({ start }));
    uiActions.registerDrilldown(new App1HelloWorldDrilldown());
    uiActions.registerDrilldown(new App1ToDashboardDrilldown({ start }));
    uiActions.registerDrilldown(new App2ToDashboardDrilldown({ start }));

    uiActions.registerTrigger(sampleApp1ClickTrigger);
    uiActions.registerTrigger(sampleApp2ClickTrigger);

    uiActions.addTriggerActionAsync(
      SAMPLE_APP2_CLICK_TRIGGER,
      SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_CREATE,
      async () => {
        const { createOpenFlyoutAtCreateAction } = await import(
          './actions/open_flyout_at_create_action'
        );
        return createOpenFlyoutAtCreateAction({ start });
      }
    );

    uiActions.addTriggerActionAsync(
      SAMPLE_APP2_CLICK_TRIGGER,
      SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_MANAGE,
      async () => {
        const { createOpenFlyoutAtManageAction } = await import(
          './actions/open_flyout_at_manage_action'
        );
        return createOpenFlyoutAtManageAction({ start });
      }
    );

    core.application.register({
      id: 'ui_actions_enhanced-explorer',
      title: 'UI Actions Enhanced Explorer',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'ui_actions_enhanced-explorer',
      title: 'UI Actions Enhanced',
      description: 'Examples of how to use drilldowns.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/ui_actions_enhanced_examples#ui-actions-enhanced-examples',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    const startServicesPromise = core.getStartServices();
    registerButtonEmbeddable(
      embeddable,
      startServicesPromise.then(([_, startDeps]) => startDeps)
    );
  }

  public start(_core: CoreStart, plugins: StartDependencies): UiActionsEnhancedExamplesStart {
    const managerWithoutEmbeddable = new UiActionsEnhancedDynamicActionManager({
      storage: new UiActionsEnhancedMemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: plugins.uiActionsEnhanced,
    });
    const managerWithoutEmbeddableSingleButton = new UiActionsEnhancedDynamicActionManager({
      storage: new UiActionsEnhancedMemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: plugins.uiActionsEnhanced,
    });
    const managerWithEmbeddable = new UiActionsEnhancedDynamicActionManager({
      storage: new UiActionsEnhancedMemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: plugins.uiActionsEnhanced,
    });

    return {
      managerWithoutEmbeddable,
      managerWithoutEmbeddableSingleButton,
      managerWithEmbeddable,
    };
  }

  public stop() {}
}
