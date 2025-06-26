/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { OBSERVABILITY_ENTITY_DEFINITIONS } from '../../../../common/saved_object_contants';
import { EntityDefinitionsResponse } from '../../../../common/types';
import { EntityDefinitionSavedObject } from '../../../saved_objects/entity_definition';
import { getEntityAssociations } from './get_entity_associations';

export async function getEntityDefinitions({
  namespace,
  soClient,
}: {
  namespace: string;
  soClient: SavedObjectsClientContract;
}): Promise<EntityDefinitionsResponse[]> {
  const entityDefinitionSavedObject = await soClient.get<EntityDefinitionSavedObject>(
    OBSERVABILITY_ENTITY_DEFINITIONS,
    namespace
  );

  if (!entityDefinitionSavedObject) {
    throw new Error(`Entity definition for namespace "${namespace}" not found`);
  }

  const entitiesRelationshipsMap = new Map<string, string[]>();
  for (const definition of entityDefinitionSavedObject.attributes.groups) {
    for (const relationship of definition.relationships ?? []) {
      const existingRelationships = entitiesRelationshipsMap.get(relationship.target) || [];
      existingRelationships.push(definition.id);
      entitiesRelationshipsMap.set(relationship.target, existingRelationships);
    }
  }

  const entityAssociationsMap = await getEntityAssociations({
    namespace,
    soClient,
  });

  return entityDefinitionSavedObject.attributes.groups.map((entityDefinition) => {
    return {
      id: entityDefinition.id,
      name: entityDefinition.name,
      attributes:
        entityDefinition.attributes
          ?.filter((attributes) => attributes.requirement_level !== 'opt_in')
          .map((attribute) => attribute.ref) ?? [],
      metrics: entityAssociationsMap.get(entityDefinition.name) ?? [],
      relationships: entitiesRelationshipsMap.get(entityDefinition.id) ?? [],
    };
  });
}
