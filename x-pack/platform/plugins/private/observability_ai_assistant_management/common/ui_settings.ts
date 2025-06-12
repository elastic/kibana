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
} from '@kbn/observability-ai-assistant-plugin/common';

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
    value: [], // Default is an empty array, which disables all anonymization rules.
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.anonymizationRulesDescription',
      {
        defaultMessage:
          'JSON array of anonymization rules. Each rule is an object with properties:\n' +
          '- id: unique string identifier\n' +
          '- entityClass: class of entity (e.g., PER, ORG, EMAIL, URL)\n' +
          '- type: "ner" or "regex"\n' +
          '- pattern: (for regex rules) the regex string to match\n' +
          '- enabled: boolean flag to turn the rule on or off\n' +
          '- builtIn: boolean indicating this is a built‑in rule\n' +
          '- description: optional human‑readable description\n' +
          'Default is an empty array, which disables all anonymization rules.',
      }
    ),
    schema: schema.arrayOf(
      schema.object({
        id: schema.string(),
        entityClass: schema.string(),
        type: schema.oneOf([schema.literal('ner'), schema.literal('regex')]),
        pattern: schema.string(),
        enabled: schema.boolean(),
        builtIn: schema.boolean(),
        description: schema.maybe(schema.string()),
      })
    ),
    type: 'json',
    requiresPageReload: true,
    solution: 'oblt',
  },
};
