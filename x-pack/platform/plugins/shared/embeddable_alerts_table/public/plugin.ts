/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EMBEDDABLE_ALERTS_TABLE_ID } from './constants';
import {
  EmbeddableAlertsTablePluginSetup,
  EmbeddableAlertsTablePluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export class EmbeddableAlertsTablePlugin
  implements Plugin<EmbeddableAlertsTablePluginSetup, EmbeddableAlertsTablePluginStart>
{
  public setup(core: CoreSetup<StartDependencies>, { embeddable }: SetupDependencies) {
    embeddable.registerReactEmbeddableFactory(EMBEDDABLE_ALERTS_TABLE_ID, async () => {
      const startServicesPromise = core.getStartServices();

      const { getAlertsTableFactory } = await import('./alerts_table_embeddable');
      const [coreStart, deps] = await startServicesPromise;
      return getAlertsTableFactory(coreStart, deps);
    });

    return {};
  }

  public start(core: CoreStart, { uiActions }: StartDependencies) {
    // Waiting for other dependent PRs to be merged to enable this
    // registerCreateAlertsTableAction(core, uiActions);
    return {};
  }

  public stop() {}
}
