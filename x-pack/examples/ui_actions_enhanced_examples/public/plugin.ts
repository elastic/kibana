/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h } from 'react';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { Plugin, CoreSetup, CoreStart, AppNavLinkStatus } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '../../../../x-pack/plugins/ui_actions_enhanced/public';
import { DashboardHelloWorldDrilldown } from './drilldowns/dashboard_hello_world_drilldown';
import { DashboardToDiscoverDrilldown } from './drilldowns/dashboard_to_discover_drilldown';
import { App1ToDashboardDrilldown } from './drilldowns/app1_to_dashboard_drilldown';
import { App1HelloWorldDrilldown } from './drilldowns/app1_hello_world_drilldown';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import { DashboardSetup, DashboardStart } from '../../../../src/plugins/dashboard/public';
import { DashboardHelloWorldOnlyRangeSelectDrilldown } from './drilldowns/dashboard_hello_world_only_range_select_drilldown';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import {
  sampleApp1ClickTrigger,
  sampleApp2ClickTrigger,
  SAMPLE_APP2_CLICK_TRIGGER,
  SampleApp2ClickContext,
  sampleApp2ClickContext,
} from './triggers';
import { mount } from './mount';
import {
  UiActionsEnhancedMemoryActionStorage,
  UiActionsEnhancedDynamicActionManager,
} from '../../../plugins/ui_actions_enhanced/public';
import { App2ToDashboardDrilldown } from './drilldowns/app2_to_dashboard_drilldown';

export interface SetupDependencies {
  dashboard: DashboardSetup;
  data: DataPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
  discover: DiscoverSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

export interface UiActionsEnhancedExamplesStart {
  managerWithoutEmbeddable: UiActionsEnhancedDynamicActionManager;
  managerWithoutEmbeddableSingleButton: UiActionsEnhancedDynamicActionManager;
  managerWithEmbeddable: UiActionsEnhancedDynamicActionManager;
}

export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, UiActionsEnhancedExamplesStart, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies, UiActionsEnhancedExamplesStart>,
    { uiActionsEnhanced: uiActions, developerExamples }: SetupDependencies
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

    uiActions.addTriggerAction(SAMPLE_APP2_CLICK_TRIGGER, {
      id: 'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_CREATE',
      order: 2,
      getDisplayName: () => 'Add drilldown',
      getIconType: () => 'plusInCircle',
      isCompatible: async ({ workpadId, elementId }: SampleApp2ClickContext) =>
        workpadId === '123' && elementId === '456',
      execute: async () => {
        const { core: coreStart, plugins: pluginsStart, self } = start();
        const handle = coreStart.overlays.openFlyout(
          toMountPoint(
            h(pluginsStart.uiActionsEnhanced.DrilldownManager, {
              onClose: () => handle.close(),
              initialRoute: '/create',
              dynamicActionManager: self.managerWithoutEmbeddableSingleButton,
              triggers: [SAMPLE_APP2_CLICK_TRIGGER],
              placeContext: {},
            })
          ),
          {
            ownFocus: true,
          }
        );
      },
    });
    uiActions.addTriggerAction(SAMPLE_APP2_CLICK_TRIGGER, {
      id: 'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_MANAGE',
      order: 1,
      getDisplayName: () => 'Manage drilldowns',
      getIconType: () => 'list',
      isCompatible: async ({ workpadId, elementId }: SampleApp2ClickContext) =>
        workpadId === '123' && elementId === '456',
      execute: async () => {
        const { core: coreStart, plugins: pluginsStart, self } = start();
        const handle = coreStart.overlays.openFlyout(
          toMountPoint(
            h(pluginsStart.uiActionsEnhanced.DrilldownManager, {
              onClose: () => handle.close(),
              initialRoute: '/manage',
              dynamicActionManager: self.managerWithoutEmbeddableSingleButton,
              triggers: [SAMPLE_APP2_CLICK_TRIGGER],
              placeContext: { sampleApp2ClickContext },
            })
          ),
          {
            ownFocus: true,
          }
        );
      },
    });

    core.application.register({
      id: 'ui_actions_enhanced-explorer',
      title: 'UI Actions Enhanced Explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
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
  }

  public start(core: CoreStart, plugins: StartDependencies): UiActionsEnhancedExamplesStart {
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
