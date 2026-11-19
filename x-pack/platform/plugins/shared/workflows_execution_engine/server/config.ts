/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { DEFAULT_MAX_STEP_SIZE } from './step/errors';

const EventTriggersConfigSchema = schema.object({
  /**
   * When false, event-driven workflow execution is disabled: event-triggered runs
   * (triggeredBy not in manual/scheduled/alert) are skipped at execution time.
   */
  enabled: schema.boolean({ defaultValue: true }),
  /**
   * When false, trigger events are not logged to the trigger-events data stream.
   */
  logEvents: schema.boolean({ defaultValue: true }),
  /**
   * Maximum depth for event-triggered chains (any workflow in the chain).
   * Scheduling is skipped when depth exceeds this value.
   */
  maxChainDepth: schema.number({ defaultValue: 10, min: 1 }),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  storage: schema.object({
    source: schema.oneOf([schema.literal('plain_index'), schema.literal('data_stream')], {
      defaultValue: 'plain_index',
    }),
    dataRetention: schema.string({
      defaultValue: '90d',
      validate: (value) =>
        /^[1-9]\d*(d|h|m|s)$/.test(value)
          ? undefined
          : 'must be a positive duration like "90d", "12h", "30m" or "45s"',
    }),
  }),
  eventDriven: EventTriggersConfigSchema,
  /**
   * Maximum depth of nested workflow execution (workflow calling workflow via workflow.execute step).
   */
  maxWorkflowDepth: schema.number({ defaultValue: 10, min: 1 }),
  logging: schema.object({
    console: schema.boolean({ defaultValue: false }),
  }),
  maxResponseSize: schema.byteSize({ defaultValue: DEFAULT_MAX_STEP_SIZE }),
  eviction: schema.object({
    /**
     * Maximum total byte size of the in-memory LRU output cache.
     * When the cache exceeds this limit, the least-recently-used entries are evicted.
     * Set to "0b" to keep (almost) nothing resident; outputs are then reloaded from
     * Elasticsearch on demand.
     */
    maxCacheSize: schema.byteSize({ defaultValue: '10mb' }),
    /**
     * Deprecated. The LRU cache ignores this. A configured value logs a warning and is removed.
     * Retention is controlled by maxCacheSize.
     */
    minPayloadSize: schema.byteSize({ defaultValue: '10kb' }),
  }),
  collectQueueMetrics: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When enabled, stores queue delay metrics (scheduledAt, runAt, queueDelayMs, scheduleDelayMs) in workflow executions. ' +
        'Useful for observability but adds to document size. Disabled by default for performance.',
    },
  }),
  /**
   * External HITL resume (API-key public routes + channel notifications).
   * Disable via `workflowsExecutionEngine.hitlExternalResume.enabled` and
   * `workflowsManagement.hitlExternalResume.enabled` in `kibana.yml`.
   */
  hitlExternalResume: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type EventTriggersConfig = TypeOf<typeof EventTriggersConfigSchema>;
export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig> = {
  schema: configSchema,
  deprecations: ({ unused }) => [
    unused('http', {
      level: 'warning',
      message: i18n.translate('workflowsExecutionEngine.deprecations.httpUnusedMessage', {
        defaultMessage:
          'workflowsExecutionEngine.http is not used. HTTP step hosts are checked against xpack.actions.allowedHosts.',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('workflowsExecutionEngine.deprecations.httpUnused.manualStepOneMessage', {
            defaultMessage:
              'Remove workflowsExecutionEngine.http from the Kibana config file, CLI flag, or environment variable. If allowedHosts listed specific hosts, set those hosts on xpack.actions.allowedHosts.',
          }),
        ],
      },
    }),
    unused('eviction.minPayloadSize', {
      level: 'warning',
      message: i18n.translate('workflowsExecutionEngine.deprecations.minPayloadSizeUnusedMessage', {
        defaultMessage:
          'workflowsExecutionEngine.eviction.minPayloadSize is not used. Output retention is controlled by workflowsExecutionEngine.eviction.maxCacheSize.',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate(
            'workflowsExecutionEngine.deprecations.minPayloadSizeUnused.manualStepOneMessage',
            {
              defaultMessage:
                'Remove workflowsExecutionEngine.eviction.minPayloadSize from the Kibana config file, CLI flag, or environment variable. Set workflowsExecutionEngine.eviction.maxCacheSize to control how much step output stays in memory.',
            }
          ),
        ],
      },
    }),
  ],
};
