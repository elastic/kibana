/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { EmbeddableAlertsTablePublicStartDependencies } from '../types';
import { EMBEDDABLE_ALERTS_TABLE_ID } from '../constants';

export interface RegisterAlertsTableEmbeddableFactoryParams {
  embeddable: EmbeddableSetup;
  core: CoreSetup<EmbeddableAlertsTablePublicStartDependencies>;
}

export const registerAlertsTableEmbeddableFactory = ({
  embeddable,
  core,
}: RegisterAlertsTableEmbeddableFactoryParams) => {
  embeddable.registerReactEmbeddableFactory(EMBEDDABLE_ALERTS_TABLE_ID, async () => {
    const [coreStart, deps] = await core.getStartServices();
    const { getAlertsTableEmbeddableFactory } = await import('./alerts_table_embeddable_factory');
    return getAlertsTableEmbeddableFactory(coreStart, deps);
  });
};
