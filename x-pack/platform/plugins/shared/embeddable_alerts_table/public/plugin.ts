/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerAlertsTableEmbeddableFactory } from './factories/register_alerts_table_embeddable_factory';
import type {
  EmbeddableAlertsTablePublicSetup,
  EmbeddableAlertsTablePublicStart,
  EmbeddableAlertsTablePublicSetupDependencies,
  EmbeddableAlertsTablePublicStartDependencies,
} from './types';

export class EmbeddableAlertsTablePlugin
  implements
    Plugin<
      EmbeddableAlertsTablePublicSetup,
      EmbeddableAlertsTablePublicStart,
      EmbeddableAlertsTablePublicSetupDependencies,
      EmbeddableAlertsTablePublicStartDependencies
    >
{
  public setup(
    core: CoreSetup<EmbeddableAlertsTablePublicStartDependencies>,
    { embeddable }: EmbeddableAlertsTablePublicSetupDependencies
  ) {
    registerAlertsTableEmbeddableFactory({ embeddable, core });
    return {};
  }

  public start({ http }: CoreStart, { uiActions }: EmbeddableAlertsTablePublicStartDependencies) {
    // Waiting for other dependent PRs to be merged to enable this
    // registerAddAlertsTableAction({ http, uiActions });
    return {};
  }

  public stop() {}
}
