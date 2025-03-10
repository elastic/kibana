/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app/index.scss';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import { TransformUiPlugin } from './plugin';

/** @public */
export const plugin = (ctx: PluginInitializerContext) => {
  return new TransformUiPlugin(ctx);
};

export { getTransformHealthRuleType } from './alerting';
