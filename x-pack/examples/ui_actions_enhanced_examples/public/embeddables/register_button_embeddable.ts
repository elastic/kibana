/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { StartDependencies } from '../plugin';

export const BUTTON_EMBEDDABLE = 'BUTTON_EMBEDDABLE';

export function registerButtonEmbeddable(
  embeddable: EmbeddableSetup,
  services: Promise<StartDependencies>
) {
  embeddable.registerReactEmbeddableFactory(BUTTON_EMBEDDABLE, async () => {
    const { getButtonEmbeddableFactory } = await import('./button_embeddable');
    const { uiActionsEnhanced } = await services;
    return getButtonEmbeddableFactory(uiActionsEnhanced);
  });
}
