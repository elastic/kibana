/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_RESET,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
  entitiesAliasPattern,
} from '@kbn/entities-schema';
import { generateResetIndexTemplateId } from '../helpers/generate_component_id';
import {
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
  ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
} from '../../../../common/constants_entities';

export const generateEntitiesResetIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateResetIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the reset dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
    ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
    ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
  ],
  index_patterns: [
    entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_RESET,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    aliases: {
      [entitiesAliasPattern({ type: definition.type, dataset: ENTITY_RESET })]: {},
    },
  },
});
