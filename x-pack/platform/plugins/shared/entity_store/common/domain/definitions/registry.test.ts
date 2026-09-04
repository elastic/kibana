/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_ENTITY_TYPES, entitySchema } from './entity_schema';
import { getEntityDefinitionWithoutId } from './registry';

/**
 * Tests that all entity definitions parse against the entitySchema (does not throw errors)
 */
describe('entitiesDefinitionRegistry', () => {
  it.each(ALL_ENTITY_TYPES)('%s definition parses against entitySchema', (entityType) => {
    const definition = getEntityDefinitionWithoutId(entityType);

    expect(() => entitySchema.parse({ ...definition, id: entityType })).not.toThrow();
  });
});
