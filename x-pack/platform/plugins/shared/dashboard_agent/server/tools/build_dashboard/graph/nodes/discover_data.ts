/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { indexExplorer, getIndexMappings } from '@kbn/agent-builder-genai-utils';

import type { BuildDashboardState, IndexField } from '../state';
import type { DiscoverDataAction } from '../../types';

export interface DiscoverDataNodeDeps {
  model: ScopedModel;
  logger: Logger;
  esClient: IScopedClusterClient;
}

export function createDiscoverDataNode({ model, logger, esClient }: DiscoverDataNodeDeps) {
  return async (state: BuildDashboardState) => {
    let action: DiscoverDataAction;
    try {
      let targetIndex = state.index;

      if (!targetIndex) {
        const { resources } = await indexExplorer({
          nlQuery: state.query,
          esClient: esClient.asCurrentUser,
          limit: 1,
          model,
        });

        if (resources.length === 0) {
          throw new Error(
            'Could not discover a suitable index for the query. Please specify an index explicitly.'
          );
        }

        targetIndex = resources[0].name;
      }

      const mappings = await getIndexMappings({
        indices: [targetIndex],
        esClient: esClient.asCurrentUser,
      });

      const fields: IndexField[] = [];
      for (const indexName of Object.keys(mappings)) {
        const indexMappings = mappings[indexName]?.mappings?.properties || {};
        for (const [fieldName, fieldDef] of Object.entries(indexMappings)) {
          const fieldType = (fieldDef as { type?: string }).type || 'object';
          fields.push({ name: fieldName, type: fieldType });
        }
      }

      logger.debug(`Discovered index "${targetIndex}" with ${fields.length} fields`);

      action = {
        type: 'discover_data',
        success: true,
        discoveredIndex: targetIndex,
        fieldCount: fields.length,
      };

      return {
        discoveredIndex: targetIndex,
        indexFields: fields,
        actions: [action],
      };
    } catch (error) {
      logger.error(`Failed to discover data: ${error.message}`);
      action = {
        type: 'discover_data',
        success: false,
        error: error.message,
      };

      return {
        error: `Failed to discover data sources: ${error.message}`,
        actions: [action],
      };
    }
  };
}
