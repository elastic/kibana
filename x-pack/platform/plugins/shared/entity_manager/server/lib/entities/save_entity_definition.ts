/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';

export async function saveEntityDefinition(
  soClient: SavedObjectsClientContract,
  definition: EntityDefinition
): Promise<EntityDefinition> {
  await soClient.create<EntityDefinition>(SO_ENTITY_DEFINITION_TYPE, definition, {
    id: definition.id,
    managed: definition.managed,
    overwrite: true,
  });

  return definition;
}

export async function entityDefinitionExists(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<boolean> {
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${id})`,
  });

  return response.total === 1;
}

export async function updateEntityDefinition(
  soClient: SavedObjectsClientContract,
  id: string,
  definition: Partial<EntityDefinition>
) {
  return await soClient.update<EntityDefinition>(SO_ENTITY_DEFINITION_TYPE, id, definition);
}
