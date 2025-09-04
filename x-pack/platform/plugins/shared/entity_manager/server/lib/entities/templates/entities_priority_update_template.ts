/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
  ENTITY_PRIORITY_UPDATES,
} from '@kbn/entities-schema';
import { generatePriorityUpdateIndexTemplateId } from '../helpers/generate_component_id';
import {
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
} from '../../../../common/constants_entities';

export const generateEntitiesPriorityUpdateIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generatePriorityUpdateIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the priority updates dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'elastic_entity_model',
  },
  ignore_missing_component_templates: getCustomLatestTemplateComponents(definition),
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
    ...getCustomLatestTemplateComponents(definition),
  ],
  index_patterns: [
    entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_PRIORITY_UPDATES,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    settings: {
      index: {
        codec: 'best_compression',
      },
    },
  },
});

function getCustomLatestTemplateComponents(definition: EntityDefinition) {
  return [`${definition.id}-priority-update@platform`, `${definition.id}-priority-update@custom`];
}
