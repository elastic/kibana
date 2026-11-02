/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Build-time port for `server/config.ts`. The real module builds the config schema with
// `@kbn/config-schema` at import time; the executor only needs the parsed values and
// `getQueryRowLimit`.
import type { PluginConfig } from '../../../server/config';
import type { EsqlResponseFormat } from '../../../server/lib/services/query_service/formats';
import { ByteSizeValue } from './config_schema';

export type { PluginConfig, RulesConfig, RetentionConfig } from '../../../server/config';

export const getQueryRowLimit = (config: PluginConfig, format: EsqlResponseFormat): number => {
  const maxAlerts = config.rules.run.alerts.max;
  const { maxRows } = format;

  return maxRows === undefined ? maxAlerts : Math.min(maxAlerts, maxRows);
};

/** Plugin defaults from `configSchema`, hard-coded. The coordinator would send the parsed values. */
export const DEFAULT_PLUGIN_CONFIG: PluginConfig = {
  enabled: true,
  invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
  rules: {
    minimumScheduleInterval: '1m',
    maxScheduledPerMinute: 32000,
    run: {
      alerts: { max: 10000 },
      maxGroupsPerExecution: 10000,
      timeout: undefined,
      query: { maxResponseSize: ByteSizeValue.parse('50mb') },
    },
  },
  retention: {
    ruleEvents: { enabled: false, dataRetention: '90d' },
    alertActions: { dispatcher: { enabled: false, dataRetention: '90d' } },
  },
};
