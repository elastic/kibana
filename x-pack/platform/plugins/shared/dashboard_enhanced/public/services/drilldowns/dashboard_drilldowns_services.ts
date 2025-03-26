/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { SetupDependencies, StartDependencies } from '../../plugin';
import { EmbeddableToDashboardDrilldown } from './embeddable_to_dashboard_drilldown';
import { OPEN_FLYOUT_ADD_DRILLDOWN } from './actions/flyout_create_drilldown/constants';
import { OPEN_FLYOUT_EDIT_DRILLDOWN } from './actions/flyout_edit_drilldown/constants';

interface BootstrapParams {
  enableDrilldowns: boolean;
}

export class DashboardDrilldownsService {
  bootstrap(
    core: CoreSetup<StartDependencies>,
    plugins: SetupDependencies,
    { enableDrilldowns }: BootstrapParams
  ) {
    if (enableDrilldowns) {
      this.setupDrilldowns(core, plugins);
    }
  }

  setupDrilldowns(
    core: CoreSetup<StartDependencies>,
    { uiActionsEnhanced: uiActions }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, OPEN_FLYOUT_ADD_DRILLDOWN, async () => {
      const { FlyoutCreateDrilldownAction } = await import('./async_module');
      return new FlyoutCreateDrilldownAction({ start });
    });

    uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, OPEN_FLYOUT_EDIT_DRILLDOWN, async () => {
      const { FlyoutEditDrilldownAction } = await import('./async_module');
      return new FlyoutEditDrilldownAction({ start });
    });

    const dashboardToDashboardDrilldown = new EmbeddableToDashboardDrilldown({ start });
    uiActions.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
