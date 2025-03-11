/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_ENTITY_COMPONENT_TEMPLATE_V1 } from '../../../common/constants_entities';

export const entitiesEntityComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
  _meta: {
    description:
      "Component template for the entity fields used in the Elastic Entity Model's entity discovery framework",
    ecs_version: '8.0.0',
    managed: true,
  },
  template: {
    mappings: {
      properties: {
        entity: {
          properties: {
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            definition_id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            definition_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            schema_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            last_seen_timestamp: {
              type: 'date',
            },
            identity_fields: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
};
