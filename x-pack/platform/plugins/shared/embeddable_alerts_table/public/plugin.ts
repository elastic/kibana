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
import { registerAddAlertsTableAction } from './actions/register_add_alerts_table_action';

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

  public start(
    coreServices: CoreStart,
    { uiActions }: EmbeddableAlertsTablePublicStartDependencies
  ) {
    registerAddAlertsTableAction({ coreServices, uiActions });
    return {};
  }

  public stop() {}
}
