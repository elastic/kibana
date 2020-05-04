/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { ReportingPlugin as Plugin } from './plugin';
import { ReportingConfig, ReportingCore } from './core';

export const plugin = (context: PluginInitializerContext, config: ReportingConfig) => {
  return new Plugin(context, config);
};

export { ReportingPlugin } from './plugin';
export { ReportingConfig, ReportingCore };

export { PreserveLayout, PrintLayout } from '../export_types/common/layouts';
