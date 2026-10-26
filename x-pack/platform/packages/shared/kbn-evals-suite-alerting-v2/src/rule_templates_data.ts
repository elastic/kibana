/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleTemplateData } from '@kbn/alerting-v2-schemas';
import { HOST_METRICS_CPU_FIELD, HOST_METRICS_INDEX } from './full_stack_data';

const RULE_TEMPLATE_SAVED_OBJECT_TYPE = 'alerting_rule_template';

export const HOST_MEMORY_FIELD = 'system.memory.actual.used.pct';

/**
 * Rule templates seeded for the template evals. The two host templates read the
 * seeded data-forge host metrics (so `has_data` is true and they compete for
 * "host" requests); the nginx template reads a data stream that is never seeded.
 */
export const EVAL_RULE_TEMPLATES = {
  hostCpu: {
    id: 'eval-host-cpu-high',
    attributes: {
      engine: 'v2',
      rule: {
        kind: 'alert',
        metadata: {
          name: 'Host CPU usage is high',
          description: 'Alerts when average CPU utilization of a host stays above 90%.',
          tags: ['fake_hosts', 'host', 'cpu', 'infrastructure'],
        },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          base: `FROM ${HOST_METRICS_INDEX} | STATS cpu = AVG(${HOST_METRICS_CPU_FIELD}) BY host.name`,
          breach: { segment: 'WHERE cpu > 0.9' },
        },
        grouping: { fields: ['host.name'] },
        state_transition: { pending: { count: 3 } },
      },
    },
  },
  hostMemory: {
    id: 'eval-host-memory-high',
    attributes: {
      engine: 'v2',
      rule: {
        kind: 'alert',
        metadata: {
          name: 'Host memory usage is high',
          description: 'Alerts when average memory utilization of a host stays above 85%.',
          tags: ['fake_hosts', 'host', 'memory', 'infrastructure'],
        },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          base: `FROM ${HOST_METRICS_INDEX} | STATS memory = AVG(${HOST_MEMORY_FIELD}) BY host.name`,
          breach: { segment: 'WHERE memory > 0.85' },
        },
        grouping: { fields: ['host.name'] },
      },
    },
  },
  nginxErrors: {
    id: 'eval-nginx-5xx-rate',
    attributes: {
      engine: 'v2',
      rule: {
        kind: 'alert',
        metadata: {
          name: 'Nginx high 5xx error rate',
          description: 'Alerts when more than 5% of nginx responses are server errors.',
          tags: ['nginx', 'web'],
        },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          base: 'FROM logs-nginx.access-* | STATS error_rate = AVG(CASE(http.response.status_code >= 500, 1.0, 0.0)) BY host.name',
          breach: { segment: 'WHERE error_rate > 0.05' },
        },
        grouping: { fields: ['host.name'] },
      },
    },
  },
} as const satisfies Record<string, { id: string; attributes: RuleTemplateData }>;

/**
 * Seeds the eval templates through the FTR saved objects client: the template
 * type is hidden and Fleet-installed, so there is no public write API.
 */
export const installEvalRuleTemplates = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<void> => {
  for (const { id, attributes } of Object.values(EVAL_RULE_TEMPLATES)) {
    await kbnClient.savedObjects.create({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      id,
      attributes,
      overwrite: true,
    });
  }
  log.info(`Seeded ${Object.keys(EVAL_RULE_TEMPLATES).length} eval rule templates`);
};

export const removeEvalRuleTemplates = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<void> => {
  await kbnClient.savedObjects.clean({ types: [RULE_TEMPLATE_SAVED_OBJECT_TYPE] });
  log.info('Removed eval rule templates');
};
