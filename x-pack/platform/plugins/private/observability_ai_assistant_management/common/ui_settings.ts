/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import {
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
  aiAssistantAnonymizationRules,
  NER_MODEL_ID,
} from '@kbn/observability-ai-assistant-plugin/common';

const baseRuleSchema = schema.object({
  enabled: schema.boolean(),
});

const regexRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('regex'),
    pattern: schema.string(),
    entityClass: schema.string(),
  }),
]);

const nerRuleSchema = schema.allOf([
  baseRuleSchema,
  schema.object({
    type: schema.literal('ner'),
    modelId: schema.maybe(schema.string()),
  }),
]);

export const uiSettings: Record<string, UiSettingsParams> = {
  [aiAssistantSimulatedFunctionCalling]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.simulatedFunctionCallingLabel',
      {
        defaultMessage: 'Simulate function calling',
      }
    ),
    value: false,
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.simulatedFunctionCallingDescription',
      {
        defaultMessage:
          '<em>[technical preview]</em> Simulated function calling does not need API support for functions or tools, but it may decrease performance. It is currently always enabled for connectors that do not have API support for Native function calling, regardless of this setting.',
        values: {
          em: (chunks) => `<em>${chunks}</em>`,
        },
      }
    ),
    schema: schema.boolean(),
    type: 'boolean',
    requiresPageReload: true,
    solution: 'oblt',
  },
  [aiAssistantSearchConnectorIndexPattern]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsTab.h3.searchConnectorIndexPatternLabel',
      { defaultMessage: 'Search connector index pattern' }
    ),
    value: '',
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.searchConnectorIndexPatternDescription',
      {
        defaultMessage:
          'Index pattern used by the AI Assistant when querying search connectors indices (part of the knowledge base). By default the index for every search connector will be queried',
      }
    ),
    schema: schema.string(),
    type: 'string',
    requiresPageReload: true,
    solution: 'oblt',
  },
  [aiAssistantAnonymizationRules]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsTab.anonymizationRulesLabel',
      { defaultMessage: 'Anonymization Rules' }
    ),
    value: JSON.stringify(
      [
        {
          entityClass: 'EMAIL',
          type: 'regex',
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
          enabled: false,
        },
        {
          type: 'ner',
          modelId: NER_MODEL_ID,
          enabled: false,
        },
      ],
      null,
      2
    ),
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.anonymizationRulesDescription',
      {
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
      }
    ),
    schema: schema.arrayOf(schema.oneOf([regexRuleSchema, nerRuleSchema])),
    type: 'json',
    requiresPageReload: true,
    solution: 'oblt',
  },
};
