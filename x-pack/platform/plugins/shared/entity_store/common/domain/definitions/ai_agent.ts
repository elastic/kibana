/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionManagedBy, ManagedEntityDefinitionWithoutId } from './entity_schema';
import { PLUGIN_ID } from '../../plugin_id';
import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import { newestValue } from './field_retention_operations';

/**
 * Only the agent's own events create or update an agent. A descendant can run as another OS user
 * (`sudo`), which would otherwise mint an agent for that user. The value is a string because the
 * store casts condition fields with TO_STRING in ES|QL.
 */
const agentOwnEventCondition = {
  or: [
    { field: 'process.ai_agent.is_descendant', exists: false },
    { field: 'process.ai_agent.is_descendant', eq: 'false' },
  ],
};

export const aiAgentEntityDefinition: ManagedEntityDefinitionWithoutId & {
  managedBy: EntityDefinitionManagedBy;
} = {
  type: 'ai_agent',
  managedBy: { kind: 'plugin', id: PLUGIN_ID },
  name: 'AI agent',
  description:
    'A local install of an AI agent product for one OS user on one host. Identified by process.ai_agent.name, host.id and user.name.',
  identityField: {
    documentsFilter: {
      and: [
        isNotEmptyCondition('process.ai_agent.name'),
        isNotEmptyCondition('host.id'),
        isNotEmptyCondition('user.name'),
        agentOwnEventCondition,
      ],
    },
    euidRanking: {
      branches: [
        {
          ranking: [
            [
              { field: 'process.ai_agent.name' },
              { sep: '@' },
              { field: 'host.id' },
              { sep: '@' },
              { field: 'user.name' },
            ],
          ],
        },
      ],
    },
  },
  extraction: {
    entityTypeFallback: 'AI Agent',
    fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
    whenConditionTrueSetFieldsPreAgg: [
      {
        condition: { always: {} },
        fields: {
          // Equals the host EUID because the documents filter requires host.id, which ranks first for host.
          'entity.relationships.depends_on.entity.id': {
            composition: { prefix: 'host:', fields: ['host.id'], sep: '' },
          },
          'entity.relationships.acts_on_behalf_of.user.email': { source: 'process.ai_agent.email' },
        },
      },
    ],
    whenConditionTrueSetFieldsAfterStats: [
      {
        condition: isNotEmptyCondition('host.name'),
        fields: {
          'entity.name': {
            composition: { fields: ['process.ai_agent.name', 'user.name', 'host.name'], sep: '@' },
          },
        },
      },
      {
        condition: { not: isNotEmptyCondition('host.name') },
        fields: {
          'entity.name': {
            composition: { fields: ['process.ai_agent.name', 'user.name'], sep: '@' },
          },
        },
      },
    ],
    fields: [
      newestValue({ source: 'entity.name' }),
      newestValue({ source: 'process.ai_agent.name' }),
      newestValue({ source: 'host.id' }),
      newestValue({ source: 'host.name' }),
      newestValue({ source: 'user.name' }),
      newestValue({ source: 'process.executable' }),
      newestValue({ source: 'process.ai_agent.api_key_auth', mapping: { type: 'boolean' } }),
      ...getCommonFieldDescriptions('entity'),
      ...getEntityFieldsDescriptions(),
    ],
  },
} as const satisfies ManagedEntityDefinitionWithoutId;
