/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type { CustomContentEmbeddableState } from './embeddable/schemas';
export { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '../common/constants';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { CustomContentPlugin } = await import('./plugin');
  return new CustomContentPlugin(initializerContext);
};
