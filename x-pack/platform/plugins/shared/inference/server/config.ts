/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  workers: schema.object({
    anonymization: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      minThreads: schema.number({ defaultValue: 0, min: 0 }),
      maxThreads: schema.number({ defaultValue: 3, min: 1 }),
      maxQueue: schema.number({ defaultValue: 20, min: 1 }),
      idleTimeout: schema.duration({ defaultValue: '30s' }),
      taskTimeout: schema.duration({ defaultValue: '15s' }),
    }),
  }),
  anonymization: schema.object({
    /**
     * Enables the workflow-driven hook path (inference.beforeCompletion /
     * inference.afterCompletion). When false (default), the legacy
     * prepareAnonymization / deanonymizeMessage path runs unchanged.
     *
     * This flag is intentionally opt-in while the workflow-driven path is
     * being validated. Set to true in kibana.yml to activate the new path.
     */
    experimental_workflow_driven: schema.boolean({ defaultValue: false }),
    /**
     * Controls what happens when the beforeCompletion hook fails.
     * - 'block': throw `InferenceAnonymizationUnavailableError` (fail-safe)
     * - 'allow_unsafe': log a warning and pass the raw prompt to the LLM
     */
    failureMode: schema.oneOf([schema.literal('block'), schema.literal('allow_unsafe')], {
      defaultValue: 'block',
    }),
    /**
     * Maximum number of tokens allowed per chatComplete call before the hook
     * path rejects the request. Defaults to 1M to accommodate modern large-context
     * models; lower this if anonymization overhead on very large prompts is a concern.
     */
    maxTokensPerCall: schema.number({ defaultValue: 1000000, min: 1 }),
  }),
});

export type InferenceConfig = TypeOf<typeof configSchema>;

export type AnonymizationWorkerConfig = InferenceConfig['workers']['anonymization'];
