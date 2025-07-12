/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { aiAnonymizationSettings } from '@kbn/inference-common';

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
        ])
      )
    ),
  }),
]);

export const uiSettings: Record<string, UiSettingsParams> = {
  [aiAnonymizationSettings]: {
    category: ['observability'],
    name: i18n.translate('xpack.inference.anonymizationSettingsLabel', {
      defaultMessage: 'Anonymization Settings',
    }),
    value: JSON.stringify(
      {
        rules: [
          {
            entityClass: 'EMAIL',
            type: 'RegExp',
            pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
            enabled: false,
          },
          {
            type: 'NER',
            modelId: 'elastic__distilbert-base-uncased-finetuned-conll03-english',
            enabled: false,
            allowedEntityClasses: ['PER', 'ORG', 'LOC'],
          },
        ],
      },
      null,
      2
    ),
    description: i18n.translate('xpack.inference.anonymizationSettingsDescription', {
      defaultMessage: `List of anonymization rules
          <ul>
            <li><strong>type:</strong> "ner" or "regex"</li>
            <li><strong>entityClass:</strong> (regex type only) eg: EMAIL, URL, IP</li>
            <li><strong>pattern:</strong> (regex type only) the regular-expression string to match</li>
            <li><strong>modelId:</strong> (ner type only) ID of the NER (Named Entity Recognition) model to use</li>
            <li><strong>enabled:</strong> boolean flag to turn the rule on or off</li>
          </ul>`,
      values: {
        ul: (chunks) => `<ul>${chunks}</ul>`,
        li: (chunks) => `<li>${chunks}</li>`,
        strong: (chunks) => `<strong>${chunks}</strong>`,
      },
    }),
    schema: schema.object({
      rules: schema.arrayOf(schema.oneOf([regexRuleSchema, nerRuleSchema])),
    }),
    type: 'json',
    requiresPageReload: true,
  },
};
