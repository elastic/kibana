/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  anonymization: schema.object({
    workflow_driven: schema.boolean({ defaultValue: false }),
    encryptionKey: schema.maybe(schema.string()),
    failureMode: schema.oneOf([schema.literal('block'), schema.literal('allow_unsafe')], {
      defaultValue: 'block',
    }),
    // How long (in seconds) the resolved trigger-match result is cached per (space, agentId).
    // A workflow configuration change (enable/disable/delete) takes up to this many seconds to
    // take effect. Set to 0 to disable caching entirely at the cost of an ES lookup on every
    // anonymization-eligible inference call.
    triggerCacheTtlSeconds: schema.number({ defaultValue: 30, min: 0 }),
  }),
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
});

export type InferenceConfig = TypeOf<typeof configSchema>;

export type AnonymizationWorkerConfig = InferenceConfig['workers']['anonymization'];
export type WorkflowAnonymizationFailureMode = InferenceConfig['anonymization']['failureMode'];
