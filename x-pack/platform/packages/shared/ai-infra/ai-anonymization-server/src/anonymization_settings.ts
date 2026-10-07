/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { NER_MODEL_ID } from '@kbn/ai-anonymization-common';
import type { AnonymizationSettings } from '@kbn/ai-anonymization-common';

const baseRuleSchema = schema.object({
  enabled: schema.boolean(),
});

const regexRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('RegExp'),
    pattern: schema.string(),
    entityClass: schema.string(),
  }),
]);

const nerRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('NER'),
    modelId: schema.string(),
    allowedEntityClasses: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('PER'),
          schema.literal('ORG'),
          schema.literal('LOC'),
          schema.literal('MISC'),
        ]),
        { maxSize: 4 }
      )
    ),
    timeoutSeconds: schema.maybe(schema.number({ min: 1 })),
  }),
]);

/** Validates the value of the `ai:anonymizationSettings` advanced setting. */
export const anonymizationSettingsSchema = schema.object({
  rules: schema.arrayOf(schema.oneOf([regexRuleSchema, nerRuleSchema]), { maxSize: 100 }),
});

/** Default value of the `ai:anonymizationSettings` advanced setting. */
export const DEFAULT_ANONYMIZATION_SETTINGS: AnonymizationSettings = {
  rules: [
    {
      entityClass: 'EMAIL',
      type: 'RegExp',
      pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
      enabled: false,
    },
    {
      type: 'NER',
      modelId: NER_MODEL_ID,
      enabled: false,
      allowedEntityClasses: ['PER', 'ORG', 'LOC'],
      timeoutSeconds: 30,
    },
  ],
};
