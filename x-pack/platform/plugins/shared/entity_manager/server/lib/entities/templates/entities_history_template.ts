/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_HISTORY,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesHistoryIndexPattern,
  entitiesAliasPattern,
} from '@kbn/entities-schema';
import { generateHistoryIndexTemplateId } from '../helpers/generate_component_id';
import {
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
  ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
  ENTITY_HISTORY_BASE_COMPONENT_TEMPLATE_V1,
} from '../../../../common/constants_entities';
import { isBuiltinDefinition } from '../helpers/is_builtin_definition';

export const generateEntitiesHistoryIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateHistoryIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the history dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  ignore_missing_component_templates: getCustomHistoryTemplateComponents(definition),
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ENTITY_HISTORY_BASE_COMPONENT_TEMPLATE_V1,
    ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
    ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
    ...getCustomHistoryTemplateComponents(definition),
  ],
  index_patterns: [
    entitiesHistoryIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_HISTORY,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    aliases: {
      [entitiesAliasPattern({ type: definition.type, dataset: ENTITY_HISTORY })]: {},
    },
    mappings: {
      _meta: {
        version: '1.6.0',
      },
      date_detection: false,
      dynamic_templates: [
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
              fields: {
                text: {
                  type: 'text',
                },
              },
            },
            match_mapping_type: 'string',
          },
        },
        {
          entity_metrics: {
            mapping: {
              type: '{dynamic_type}',
            },
            match_mapping_type: ['long', 'double'],
            path_match: 'entity.metrics.*',
          },
        },
      ],
    },
    settings: {
      index: {
        codec: 'best_compression',
        mapping: {
          total_fields: {
            limit: 2000,
          },
        },
      },
    },
  },
});

function getCustomHistoryTemplateComponents(definition: EntityDefinition) {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    `${definition.id}@platform`, // @platform goes before so it can be overwritten by custom
    `${definition.id}-history@platform`,
    `${definition.id}@custom`,
    `${definition.id}-history@custom`,
  ];
}
