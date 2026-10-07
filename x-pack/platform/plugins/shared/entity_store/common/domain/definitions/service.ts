/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
} from './common_fields';
import type { EntityDefinitionManagedBy, EntityDefinitionWithoutId } from './entity_schema';
import { PLUGIN_ID } from '../../plugin_id';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const serviceEntityDefinition: EntityDefinitionWithoutId & {
  managedBy: EntityDefinitionManagedBy;
} = {
  type: 'service',
  managedBy: { kind: 'plugin', id: PLUGIN_ID },
  name: `Security 'service' Entity Store Definition`,
  identityField: { singleField: 'service.name' },
  indexPatterns: [],
  entityTypeFallback: 'Service',
  // No additional condition: service identity is just `service.name`.
  creatableFromSingleDocument: {},
  fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
  fields: [
    newestValue({ destination: 'entity.name', source: 'service.name' }),
    oldestValue({ source: 'service.entity.id' }),

    collect({ source: 'service.name' }),
    collect({ source: 'service.address' }),
    collect({ source: 'service.environment' }),
    collect({ source: 'service.ephemeral_id' }),
    collect({ source: 'service.id' }),
    collect({ source: 'service.node.name' }),
    collect({ source: 'service.node.roles' }),
    collect({ source: 'service.node.role' }),
    newestValue({ source: 'service.state' }),
    collect({ source: 'service.type' }),
    newestValue({ source: 'service.version' }),
    ...getCommonFieldDescriptions('service'),
    ...getEntityFieldsDescriptions('service'),
  ],
} as const satisfies EntityDefinitionWithoutId;
