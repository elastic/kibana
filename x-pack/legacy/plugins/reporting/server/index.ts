/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { ReportingConfig } from './config';
import { ReportingCore } from './core';
import { ReportingPlugin as Plugin } from './plugin';

export const plugin = (context: PluginInitializerContext, config: ReportingConfig) => {
  return new Plugin(context, config);
};

export { ReportingPlugin } from './plugin';
export { ReportingConfig, ReportingCore };
