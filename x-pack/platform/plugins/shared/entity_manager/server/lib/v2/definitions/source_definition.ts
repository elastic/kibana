/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import {
  EntitySourceDefinition,
  InternalClusterClient,
  StoredEntitySourceDefinition,
} from '../types';
import { SourceAs, runESQLQuery } from '../run_esql_query';
import { EntityDefinitionConflict } from '../errors/entity_definition_conflict';
import { readTypeDefinitions } from './type_definition';

interface StoreSourceDefinitionOptions {
  source: EntitySourceDefinition;
  clusterClient: InternalClusterClient;
  logger: Logger;
  replace?: boolean;
}

export async function storeSourceDefinition({
  source,
  clusterClient,
  logger,
  replace = false,
}: StoreSourceDefinitionOptions): Promise<EntitySourceDefinition> {
  const esClient = clusterClient.asInternalUser;

  const types = await readTypeDefinitions(clusterClient, logger);
  if (!types.some((type) => type.id === source.type_id)) {
    throw new Error(
      `Type with ID ${source.type_id} not found, cannot attach source with ID ${source.id}`
    );
  }

  const sources = await runESQLQuery('fetch source definition for conflict check', {
    esClient,
    query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "source" AND _id == "${source.type_id}:${source.id}" | KEEP _id`,
    logger,
  });

  if (sources.length !== 0 && replace === false) {
    logger.debug(`Entity source definition with ID ${source.id} already exists`);
    throw new EntityDefinitionConflict('source', source.id);
  }

  const definition: StoredEntitySourceDefinition = {
    template_version: TEMPLATE_VERSION,
    definition_type: 'source',
    source,
  };

  logger.debug(`Installing entity source definition ${source.id} for type ${source.type_id}`);
  await esClient.index({
    index: DEFINITIONS_ALIAS,
    id: `${source.type_id}:${definition.source.id}`,
    document: definition,
    refresh: true,
  });

  return definition.source;
}

export interface ReadSourceDefinitionOptions {
  type?: string;
}

export async function readSourceDefinitions(
  clusterClient: InternalClusterClient,
  logger: Logger,
  options?: ReadSourceDefinitionOptions
): Promise<EntitySourceDefinition[]> {
  const esClient = clusterClient.asInternalUser;

  const typeFilter = options?.type ? `AND source.type_id == "${options.type}"` : '';
  const sources = await runESQLQuery<SourceAs<StoredEntitySourceDefinition>>(
    'fetch all source definitions',
    {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _source | WHERE definition_type == "source" ${typeFilter} | KEEP _source`,
      logger,
    }
  );

  return sources.map((storedTypeDefinition) => storedTypeDefinition._source.source);
}
