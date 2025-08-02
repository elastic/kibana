/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateLatestMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_DEFAULT_MAX_PAGE_SEARCH_SIZE,
} from '../../../../common/constants_entities';
import {
  generateLatestBackfillTransformId,
  generateLatestBackfillIngestPipelineId,
  generateLatestBackfillIndexName,
} from '../helpers/generate_component_id';
import { generateLatestMetadataAggregations } from './generate_metadata_aggregations';
import { TRANSFORM_IGNORED_SLOW_TIERS } from './constants';

export function generateLatestBackfillTransform(
  definition: EntityDefinition,
  unique?: string,
  timestampFilter?: string
): TransformPutTransformRequest {
  if (unique === undefined) {
    // Only accept timestampFilter for unique, single-run transforms
    timestampFilter = undefined;
    unique = '';
  }
  return generateBackfillTransformPutRequest({
    definition,
    filter: generateBackfillFilters(definition, timestampFilter),
    transformId: generateLatestBackfillTransformId(definition, unique),
    docsPerSecond: definition.latest.settings?.docsPerSecond,
    maxPageSearchSize:
      definition.latest.settings?.maxPageSearchSize ?? ENTITY_DEFAULT_MAX_PAGE_SEARCH_SIZE,
  });
}

const generateBackfillTransformPutRequest = ({
  definition,
  filter,
  transformId,
  docsPerSecond,
  maxPageSearchSize,
}: {
  definition: EntityDefinition;
  transformId: string;
  filter: QueryDslQueryContainer;
  docsPerSecond?: number;
  maxPageSearchSize?: number;
}): TransformPutTransformRequest => {
  const lookback = definition.latest.lookbackPeriod;
  try {
    definition.latest.lookbackPeriod = definition.latest.initialBackfillPeriod;
    const request = {
      transform_id: transformId,
      _meta: {
        definition_version: definition.version,
        managed: definition.managed,
      },
      defer_validation: true,
      timeout: definition.latest.settings?.timeout,
      source: {
        index: definition.indexPatterns,
        query: filter,
      },
      dest: {
        index: `${generateLatestBackfillIndexName({ id: 'noop' } as EntityDefinition)}`,
        pipeline: generateLatestBackfillIngestPipelineId(definition),
      },
      settings: {
        deduce_mappings: false,
        unattended: true,
        docs_per_second: docsPerSecond,
        max_page_search_size: maxPageSearchSize,
      },
      pivot: {
        group_by: {
          ...definition.identityFields.reduce(
            (acc, id) => ({
              ...acc,
              [`entity.identity.${id.field}`]: {
                terms: { field: id.field },
              },
            }),
            {}
          ),
        },
        aggs: {
          ...generateLatestMetricAggregations(definition),
          ...generateLatestMetadataAggregations(definition),
          'entity.last_seen_timestamp': {
            max: {
              field: definition.latest.timestampField,
            },
          },
        },
      },
    };

    definition.latest.lookbackPeriod = lookback;
    return request;
  } catch (e) {
    definition.latest.lookbackPeriod = lookback;
    throw e;
  }
};

function generateBackfillFilters(definition: EntityDefinition, timestampFilter: string | undefined) {
  const filter = {
    bool: {
      must: [] as QueryDslQueryContainer[],
      must_not: [] as QueryDslQueryContainer[],
    },
  };

  if (definition.filter) {
    filter.bool.must.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  definition.identityFields.forEach(({ field }) => {
    filter.bool.must.push({ exists: { field } });
  });

  const range = timestampFilter ?? `now-${definition.latest.initialBackfillPeriod}`

  filter.bool.must.push({
    range: {
      [definition.latest.timestampField]: {
        gte: range,
      },
    },
  });

  filter.bool.must_not.push({
    terms: {
      _tier: TRANSFORM_IGNORED_SLOW_TIERS,
    },
  });
  return filter;
}
