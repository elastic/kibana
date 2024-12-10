/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { without } from 'lodash';
import { EntityV2 } from '@kbn/entities-schema';
import { Logger } from '@kbn/core/server';
import { SearchBySources, UserClusterClient } from '../types';
import { getEntityInstancesQuery } from './get_entity_instances_query';
import { mergeEntitiesList } from './merge_entities_list';
import { runESQLQuery } from '../run_esql_query';

interface SearchEntitiesBySourcesOptions extends SearchBySources {
  clusterClient: UserClusterClient;
  logger: Logger;
}

export async function searchEntitiesBySources({
  sources,
  metadata_fields: metadataFields,
  filters,
  start,
  end,
  sort,
  limit,
  clusterClient,
  logger,
}: SearchEntitiesBySourcesOptions) {
  const esClient = clusterClient.asCurrentUser;

  const entities = await Promise.all(
    sources.map(async (source) => {
      const mandatoryFields = [
        ...source.identity_fields,
        ...(source.timestamp_field ? [source.timestamp_field] : []),
        ...(source.display_name ? [source.display_name] : []),
      ];
      const metaFields = [...metadataFields, ...source.metadata_fields];

      // operations on an unmapped field result in a failing query so we verify
      // field capabilities beforehand
      const { fields } = await esClient.fieldCaps({
        index: source.index_patterns,
        fields: [...mandatoryFields, ...metaFields],
      });

      const sourceHasMandatoryFields = mandatoryFields.every((field) => !!fields[field]);
      if (!sourceHasMandatoryFields) {
        // we can't build entities without id fields so we ignore the source.
        // TODO filters should likely behave similarly. we should also throw
        const missingFields = mandatoryFields.filter((field) => !fields[field]);
        logger.info(
          `Ignoring source for type [${source.type_id}] with index_patterns [${
            source.index_patterns
          }] because some mandatory fields [${missingFields.join(', ')}] are not mapped`
        );
        return [];
      }

      // but metadata field not being available is fine
      const availableMetadataFields = metaFields.filter((field) => fields[field]);
      if (availableMetadataFields.length < metaFields.length) {
        logger.info(
          `Ignoring unmapped fields [${without(metaFields, ...availableMetadataFields).join(', ')}]`
        );
      }

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
      logger.debug(() => `Entity query: ${query}\nfilter: ${JSON.stringify(filter, null, 2)}`);

      const rawEntities = await runESQLQuery<EntityV2>('resolve entities', {
        query,
        filter,
        esClient,
        logger,
      });

      return rawEntities;
    })
  ).then((results) => results.flat());

  return mergeEntitiesList(sources, entities).slice(0, limit);
}
