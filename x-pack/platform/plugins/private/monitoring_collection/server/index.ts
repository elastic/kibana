/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema } from './config';

export type { MonitoringCollectionConfig } from './config';

export type { MonitoringCollectionSetup, MetricResult, Metric } from './plugin';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { MonitoringCollectionPlugin } = await import('./plugin');
  return new MonitoringCollectionPlugin(initContext);
};
export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
  deprecations: ({ unused }) => [
    // The logging of the OTel instrumentation is handled by core
    // https://github.com/elastic/kibana/blob/afb35a5f5e47c49a20c355b87239c731bf891931/src/core/packages/root/server-internal/src/root/index.ts#L142
    unused('opentelemetry.metrics.otlp.logLevel', {
      level: 'warning',
      message:
        'This setting is unused. Please, configure the level via the loggers interface for the logger name "telemetry"',
      documentationUrl:
        'https://www.elastic.co/docs/reference/kibana/configuration-reference/logging-settings',
    }),
  ],
};
