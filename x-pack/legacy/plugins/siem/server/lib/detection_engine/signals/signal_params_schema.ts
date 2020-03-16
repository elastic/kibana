/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';

/**
 * This is the schema for the Alert Rule that represents the SIEM alert for signals
 * that index into the .siem-signals-${space-id}
 */
export const signalParamsSchema = () =>
  schema.object({
    description: schema.string(),
    note: schema.nullable(schema.string()),
    falsePositives: schema.arrayOf(schema.string(), { defaultValue: [] }),
    from: schema.string(),
    ruleId: schema.string(),
    immutable: schema.boolean({ defaultValue: false }),
    index: schema.nullable(schema.arrayOf(schema.string())),
    language: schema.nullable(schema.string()),
    outputIndex: schema.nullable(schema.string()),
    savedId: schema.nullable(schema.string()),
    timelineId: schema.nullable(schema.string()),
    timelineTitle: schema.nullable(schema.string()),
    meta: schema.nullable(schema.object({}, { allowUnknowns: true })),
    query: schema.nullable(schema.string()),
    filters: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
    maxSignals: schema.number({ defaultValue: DEFAULT_MAX_SIGNALS }),
    riskScore: schema.number(),
    severity: schema.string(),
    threat: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
    to: schema.string(),
    type: schema.string(),
    references: schema.arrayOf(schema.string(), { defaultValue: [] }),
    version: schema.number({ defaultValue: 1 }),
  });
