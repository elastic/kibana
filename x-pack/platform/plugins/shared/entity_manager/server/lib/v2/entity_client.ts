/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  ReadSourceDefinitionOptions,
  readSourceDefinitions,
  storeSourceDefinition,
} from './definitions/source_definition';
import { readTypeDefinitions, storeTypeDefinition } from './definitions/type_definition';
import {
  EntitySourceDefinition,
  EntityTypeDefinition,
  SearchByType,
  SearchBySources,
} from './types';
import { searchEntitiesBySources } from './search/search_entities';
import { UnknownEntityType } from './errors/unknown_entity_type';

export class EntityClient {
  constructor(
    private options: {
      clusterClient: IScopedClusterClient;
      logger: Logger;
    }
  ) {}

  async searchEntities({ type, ...options }: SearchByType) {
    const sources = await readSourceDefinitions(this.options.clusterClient, this.options.logger, {
      type,
    });

    if (sources.length === 0) {
      throw new UnknownEntityType(`No sources found for entity type [${type}]`);
    }

    return searchEntitiesBySources({
      ...options,
      sources,
      clusterClient: this.options.clusterClient,
      logger: this.options.logger,
    });
  }

  async searchEntitiesBySources(options: SearchBySources) {
    return searchEntitiesBySources({
      ...options,
      clusterClient: this.options.clusterClient,
      logger: this.options.logger,
    });
  }

  async storeTypeDefinition(type: EntityTypeDefinition) {
    return storeTypeDefinition({
      type,
      clusterClient: this.options.clusterClient,
      logger: this.options.logger,
    });
  }

  async readTypeDefinitions() {
    return readTypeDefinitions(this.options.clusterClient, this.options.logger);
  }

  async storeSourceDefinition(source: EntitySourceDefinition) {
    return storeSourceDefinition({
      source,
      clusterClient: this.options.clusterClient,
      logger: this.options.logger,
    });
  }

  async readSourceDefinitions(options?: ReadSourceDefinitionOptions) {
    return readSourceDefinitions(this.options.clusterClient, this.options.logger, options);
  }
}
