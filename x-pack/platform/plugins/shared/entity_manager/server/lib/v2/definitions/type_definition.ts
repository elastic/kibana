/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import { EntityTypeDefinition, InternalClusterClient, StoredEntityTypeDefinition } from '../types';
import { SourceAs, runESQLQuery } from '../run_esql_query';
import { EntityDefinitionConflict } from '../errors/entity_definition_conflict';
import { UnknownEntityType } from '../errors/unknown_entity_type';

interface StoreTypeDefinitionOptions {
  type: EntityTypeDefinition;
  clusterClient: InternalClusterClient;
  logger: Logger;
  replace?: boolean;
}

export async function storeTypeDefinition({
  type,
  clusterClient,
  logger,
  replace = false,
}: StoreTypeDefinitionOptions): Promise<EntityTypeDefinition> {
  const esClient = clusterClient.asInternalUser;

  const types = await runESQLQuery('fetch type definition for conflict check', {
    esClient,
    query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "type" AND _id == "${type.id}" | KEEP _id | LIMIT 1000`,
    logger,
  });

  if (types.length !== 0 && replace === false) {
    logger.debug(`Entity type definition with ID ${type.id} already exists`);
    throw new EntityDefinitionConflict('type', type.id);
  }

  const definition: StoredEntityTypeDefinition = {
    template_version: TEMPLATE_VERSION,
    definition_type: 'type',
    type,
  };

  logger.debug(`Installing entity type definition ${type.id}`);
  await esClient.index({
    index: DEFINITIONS_ALIAS,
    id: `${definition.type.id}`,
    document: definition,
    refresh: 'wait_for',
  });

  return definition.type;
}

export async function readTypeDefinitions(
  clusterClient: InternalClusterClient,
  logger: Logger
): Promise<EntityTypeDefinition[]> {
  const esClient = clusterClient.asInternalUser;

  const types = await runESQLQuery<SourceAs<StoredEntityTypeDefinition>>(
    'fetch all type definitions',
    {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _source | WHERE definition_type == "type" | KEEP _source | LIMIT 1000`,
      logger,
    }
  );

  return types.map((storedTypeDefinition) => storedTypeDefinition._source.type);
}

export async function readTypeDefinitionById(
  id: string,
  clusterClient: InternalClusterClient,
  logger: Logger
): Promise<EntityTypeDefinition> {
  const esClient = clusterClient.asInternalUser;

  const types = await runESQLQuery<SourceAs<StoredEntityTypeDefinition>>(
    'fetch type definition by ID',
    {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _id,_source | WHERE definition_type == "type" AND _id == "${id}" | KEEP _source | LIMIT 1000`,
      logger,
    }
  );

  if (types.length === 0) {
    throw new UnknownEntityType(`Type with ID ${id} not found`);
  }

  return types[0]._source.type;
}
