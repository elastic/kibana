/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
export { ID as INDEX_THRESHOLD_ID } from './rule_types/index_threshold/rule_type';

export const configSchema = schema.object({});

export type Config = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<Config> = {
  exposeToBrowser: {},
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const stackAlerts = get(settings, fromPath);
      if (stackAlerts?.enabled === false || stackAlerts?.enabled === true) {
        addDeprecation({
          level: 'critical',
          configPath: 'xpack.stack_alerts.enabled',
          message: `"xpack.stack_alerts.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.stack_alerts.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};

export const plugin = async (ctx: PluginInitializerContext) => {
  const { AlertingBuiltinsPlugin } = await import('./plugin');
  return new AlertingBuiltinsPlugin(ctx);
};
