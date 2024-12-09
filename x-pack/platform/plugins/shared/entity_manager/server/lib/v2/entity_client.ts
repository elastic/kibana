/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { EntityV2 } from '@kbn/entities-schema';
import {
  ReadSourceDefinitionOptions,
  readSourceDefinitions,
  storeSourceDefinition,
} from './definitions/source_definition';
import { readTypeDefinitions, storeTypeDefinition } from './definitions/type_definition';
import { getEntityInstancesQuery } from './queries';
import { mergeEntitiesList, sortEntitiesList } from './queries/utils';
import {
  EntitySourceDefinition,
  EntityTypeDefinition,
  SearchByType,
  SearchBySources,
} from './types';
import { UnknownEntityType } from './errors/unknown_entity_type';
import { runESQLQuery } from './run_esql_query';
import { validateFields } from './search_by_source';

export class EntityClient {
  constructor(
    private options: {
      clusterClient: IScopedClusterClient;
      soClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {}

  async searchEntities({ type, ...options }: SearchByType) {
    const sources = await this.readSourceDefinitions({
      type,
    });

    if (sources.length === 0) {
      throw new UnknownEntityType(`No sources found for entity type [${type}]`);
    }

    return this.searchEntitiesBySources({
      sources,
      ...options,
    });
  }

  async searchEntitiesBySources({
    sources,
    metadata_fields: metadataFields,
    filters,
    start,
    end,
    sort,
    limit,
  }: SearchBySources) {
    const searches = sources.map(async (source) => {
      const availableMetadataFields = await validateFields({
        source,
        metadataFields,
        esClient: this.options.clusterClient.asCurrentUser,
        logger: this.options.logger,
      });

      const { query, filter } = getEntityInstancesQuery({
        source: {
          ...source,
          metadata_fields: availableMetadataFields,
          filters: [...source.filters, ...filters],
        },
        start,
        end,
        sort,
        limit,
      });
      this.options.logger.debug(
        () => `Entity query: ${query}\nfilter: ${JSON.stringify(filter, null, 2)}`
      );

      const rawEntities = await runESQLQuery<EntityV2>('resolve entities', {
        query,
        filter,
        esClient: this.options.clusterClient.asCurrentUser,
        logger: this.options.logger,
      });

      return rawEntities;
    });

    const results = await Promise.allSettled(searches);
    const entities = (
      results.filter((result) => result.status === 'fulfilled') as Array<
        PromiseFulfilledResult<EntityV2[]>
      >
    ).flatMap((result) => result.value);
    const errors = (
      results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[]
    ).map((result) => result.reason.message);

    if (sources.length === 1) {
      return { entities, errors };
    }

    // we have to manually merge, sort and limit entities since we run
    // independant queries for each source
    return {
      errors,
      entities: sortEntitiesList({
        sources,
        sort,
        entities: mergeEntitiesList({ entities, sources, metadataFields }),
      }).slice(0, limit),
    };
  }

  async storeTypeDefinition(type: EntityTypeDefinition) {
    return storeTypeDefinition(type, this.options.clusterClient, this.options.logger);
  }

  async readTypeDefinitions() {
    return readTypeDefinitions(this.options.clusterClient, this.options.logger);
  }

  async storeSourceDefinition(source: EntitySourceDefinition) {
    return storeSourceDefinition(source, this.options.clusterClient, this.options.logger);
  }

  async readSourceDefinitions(options?: ReadSourceDefinitionOptions) {
    return readSourceDefinitions(this.options.clusterClient, this.options.logger, options);
  }
}
