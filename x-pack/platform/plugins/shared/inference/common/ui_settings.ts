/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { aiAnonymizationSettings, DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/inference-common';
import type { AnonymizationSettings } from '@kbn/inference-common';
import { NER_MODEL_ID } from '@kbn/anonymization-common';

const baseRuleSchema = schema.object({
  enabled: schema.boolean(),
});

const regexRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('RegExp'),
    pattern: schema.string(),
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

/**
 * Default value of the `ai:anonymizationSettings` uiSetting. Built-in regex rule definitions
 * come from `@kbn/inference-common`'s `DEFAULT_BUILTIN_REGEX_RULES` — the single source of
 * truth `refreshBuiltInAnonymizationRules` uses to re-derive a built-in rule's current
 * definition by id at read-time (see that function's doc comment for why this matters: this
 * default is only used the *first* time the setting is saved, so a code-level fix to a
 * built-in pattern must be actively re-applied at read-time, not just shipped here). Exported
 * (rather than inlined as a JSON string) so it stays usable outside `getUiSettings()`.
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

export function getUiSettings(): Record<string, UiSettingsParams> {
  return {
    [aiAnonymizationSettings]: {
      category: ['general'],
      name: i18n.translate('xpack.inference.anonymizationSettingsLabel', {
        defaultMessage: 'Anonymization Settings',
      }),
      value: JSON.stringify(DEFAULT_ANONYMIZATION_SETTINGS, null, 2),
      description: i18n.translate('xpack.inference.anonymizationSettingsDescription', {
        defaultMessage: `Configuration for the anonymization pipeline
          <ul>
            <li><strong>maskingEnabled:</strong> master switch for the whole pipeline (off by default)</li>
            <li><strong>onFailure:</strong> "block" (fail the request) or "allow_unsafe" (proceed unmasked) when a rule cannot run</li>
            <li><strong>rules:</strong> list of anonymization rules
              <ul>
                <li><strong>type:</strong> "NER" or "RegExp"</li>
                <li><strong>entityClass:</strong> (RegExp type only) eg: EMAIL, URL, IP</li>
                <li><strong>pattern:</strong> (RegExp type only) the regular-expression string to match</li>
                <li><strong>modelId:</strong> (NER type only) ID of the NER (Named Entity Recognition) model to use</li>
                <li><strong>enabled:</strong> boolean flag to turn the rule on or off</li>
                <li><strong>timeoutSeconds:</strong> (NER type only) maximum seconds <em>per inference request</em> before timing out (multiple requests may be issued during a single chat interaction)</li>
              </ul>
            </li>
          </ul>`,
        values: {
          ul: (chunks) => `<ul>${chunks}</ul>`,
          li: (chunks) => `<li>${chunks}</li>`,
          strong: (chunks) => `<strong>${chunks}</strong>`,
          em: (chunks) => `<em>${chunks}</em>`,
        },
      }),
      schema: schema.object({
        maskingEnabled: schema.boolean({ defaultValue: false }),
        onFailure: schema.oneOf([schema.literal('block'), schema.literal('allow_unsafe')], {
          defaultValue: 'block',
        }),
        rules: schema.arrayOf(schema.oneOf([regexRuleSchema, nerRuleSchema]), { maxSize: 100 }),
      }),
      type: 'json',
      requiresPageReload: true,
      technicalPreview: true,
    },
  };
}
