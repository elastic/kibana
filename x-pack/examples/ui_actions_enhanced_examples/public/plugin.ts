/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart, AppNavLinkStatus } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '../../../../x-pack/plugins/ui_actions_enhanced/public';
import { DashboardHelloWorldDrilldown } from './drilldowns/dashboard_hello_world_drilldown';
import { DashboardToDiscoverDrilldown } from './drilldowns/dashboard_to_discover_drilldown';
import { SampleMlToUrlDrilldown } from './drilldowns/ml_to_url_drilldown';
import { SampleMlToDashboardDrilldown } from './drilldowns/ml_to_dashboard_drilldown';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import { DashboardSetup, DashboardStart } from '../../../../src/plugins/dashboard/public';
import { DashboardHelloWorldOnlyRangeSelectDrilldown } from './drilldowns/dashboard_hello_world_only_range_select_drilldown';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { sampleMlJobClickTrigger } from './triggers';
import { mount } from './mount';
import {
  UiActionsEnhancedMemoryActionStorage,
  UiActionsEnhancedDynamicActionManager,
} from '../../../plugins/ui_actions_enhanced/public';

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
  manager: UiActionsEnhancedDynamicActionManager;
}

export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, UiActionsEnhancedExamplesStart, SetupDependencies, StartDependencies> {
  public setup(
    core: CoreSetup<StartDependencies, UiActionsEnhancedExamplesStart>,
    { uiActionsEnhanced: uiActions, developerExamples }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    uiActions.registerDrilldown(new DashboardHelloWorldDrilldown());
    uiActions.registerDrilldown(new DashboardHelloWorldOnlyRangeSelectDrilldown());
    uiActions.registerDrilldown(new DashboardToDiscoverDrilldown({ start }));
    uiActions.registerDrilldown(new SampleMlToUrlDrilldown());
    uiActions.registerDrilldown(new SampleMlToDashboardDrilldown({ start }));

    uiActions.registerTrigger(sampleMlJobClickTrigger);

    core.application.register({
      id: 'ui_actions_enhanced-explorer',
      title: 'UI Actions Enhanced Explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'ui_actions_enhanced-explorer',
      title: 'UI Actions Enhanced',
      description: '',
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/tree/master/x-pack/examples/ui_actions_enhanced_examples#ui-actions-enhanced-examples',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start(core: CoreStart, plugins: StartDependencies): UiActionsEnhancedExamplesStart {
    const manager = new UiActionsEnhancedDynamicActionManager({
      storage: new UiActionsEnhancedMemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: plugins.uiActionsEnhanced,
    });

    return {
      manager,
    };
  }

  public stop() {}
}
