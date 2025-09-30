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
  ENTITY_UPDATES,
} from '@kbn/entities-schema';
import { generateUpdatesIndexTemplateId } from '../helpers/generate_component_id';
import {
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
} from '../../../../common/constants_entities';

const DATA_RETENTION_PERIOD = '1d';

export const generateEntitiesUpdatesIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateUpdatesIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the updates dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  data_stream: {}, // creates data stream
  ignore_missing_component_templates: getCustomLatestTemplateComponents(definition),
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
    ...getCustomLatestTemplateComponents(definition),
  ],
  index_patterns: [
    entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_UPDATES,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    lifecycle: {
      data_retention: DATA_RETENTION_PERIOD,
    },
    settings: {
      index: {
        codec: 'best_compression',
      },
    },
  },
});

function getCustomLatestTemplateComponents(definition: EntityDefinition) {
  return [`${definition.id}-updates@platform`, `${definition.id}-updates@custom`];
}
