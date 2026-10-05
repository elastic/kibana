/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_BUILTIN_REGEX_RULES, NER_MODEL_ID } from '@kbn/ai-anonymization-common';
import type { AnonymizationSettings } from '@kbn/ai-anonymization-common';

const validateRegexPattern = (pattern: string): string | undefined => {
  try {
    new RegExp(pattern, 'g');
  } catch (error) {
    return `must be a valid regular expression: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};

const baseRuleSchema = schema.object({
  enabled: schema.boolean(),
});

const regexRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('RegExp'),
    pattern: schema.string({ validate: validateRegexPattern }),
    entityClass: schema.string(),
    id: schema.maybe(schema.string({ maxLength: 100 })),
    name: schema.maybe(schema.string({ maxLength: 200 })),
    builtIn: schema.maybe(schema.boolean()),
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
  maskingEnabled: schema.boolean({ defaultValue: false }),
  onFailure: schema.oneOf([schema.literal('block'), schema.literal('allow_unsafe')], {
    defaultValue: 'block',
  }),
  rules: schema.arrayOf(schema.oneOf([regexRuleSchema, nerRuleSchema]), { maxSize: 100 }),
});

/**
 * Default value of the `ai:anonymizationSettings` uiSetting. Built-in regex rule definitions
 * come from `@kbn/ai-anonymization-common`'s `DEFAULT_BUILTIN_REGEX_RULES` — the single source of
 * truth `refreshBuiltInAnonymizationRules` uses to re-derive a built-in rule's current
 * definition by id at read-time (see that function's doc comment for why this matters: this
 * default is only used the *first* time the setting is saved, so a code-level fix to a
 * built-in pattern must be actively re-applied at read-time, not just shipped here). Exported
 * (rather than inlined as a JSON string) so it stays usable outside the ui setting definition.
 */
export const DEFAULT_ANONYMIZATION_SETTINGS: AnonymizationSettings = {
  maskingEnabled: false,
  onFailure: 'block',
  rules: [
    ...DEFAULT_BUILTIN_REGEX_RULES,
    {
      type: 'NER',
      modelId: NER_MODEL_ID,
      enabled: false,
      allowedEntityClasses: ['PER', 'ORG', 'LOC'],
      timeoutSeconds: 30,
    },
  ],
};
