/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EntityDefinition } from '@kbn/entities-schema';
import type {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateLatestMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_DEFAULT_LATEST_FREQUENCY,
  ENTITY_DEFAULT_LATEST_SYNC_DELAY,
  ENTITY_DEFAULT_MAX_PAGE_SEARCH_SIZE,
} from '../../../../common/constants_entities';
import {
  generateLatestTransformId,
  generateLatestIngestPipelineId,
  generateLatestIndexName,
} from '../helpers/generate_component_id';
import { generateLatestMetadataAggregations } from './generate_metadata_aggregations';
import { TRANSFORM_IGNORED_SLOW_TIERS } from './constants';

export function generateLatestTransform(
  definition: EntityDefinition
): TransformPutTransformRequest {
  return generateTransformPutRequest({
    definition,
    filter: generateFilters(definition),
    transformId: generateLatestTransformId(definition),
    frequency: definition.latest.settings?.frequency ?? ENTITY_DEFAULT_LATEST_FREQUENCY,
    syncDelay: definition.latest.settings?.syncDelay ?? ENTITY_DEFAULT_LATEST_SYNC_DELAY,
    docsPerSecond: definition.latest.settings?.docsPerSecond,
    maxPageSearchSize:
      definition.latest.settings?.maxPageSearchSize ?? ENTITY_DEFAULT_MAX_PAGE_SEARCH_SIZE,
  });
}

const generateTransformPutRequest = ({
  definition,
  filter,
  transformId,
  frequency,
  syncDelay,
  docsPerSecond,
  maxPageSearchSize,
}: {
  definition: EntityDefinition;
  transformId: string;
  filter: QueryDslQueryContainer;
  frequency: string;
  syncDelay: string;
  docsPerSecond?: number;
  maxPageSearchSize?: number;
}): TransformPutTransformRequest => {
  return {
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
      index: `${generateLatestIndexName({ id: 'noop' } as EntityDefinition)}`,
      pipeline: generateLatestIngestPipelineId(definition),
    },
    frequency,
    sync: {
      time: {
        field: definition.latest.settings?.syncField || definition.latest.timestampField,
        delay: syncDelay,
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
      docs_per_second: docsPerSecond,
      max_page_search_size: maxPageSearchSize,
    },
    pivot: {
      group_by: generatePivotGroup(definition.identityFields),
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
};

export function generatePivotGroup(identityFields: EntityDefinition['identityFields']) {
  return identityFields.reduce(
    (acc, id) => ({
      ...acc,
      [`entity.identity.${id.field}`]: {
        terms: { field: id.field },
      },
    }),
    {}
  );
}

function generateFilters(definition: EntityDefinition) {
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
    filter.bool.must_not.push({
      term: { [field]: '' }, // identity field can't be empty
    });
  });

  filter.bool.must.push({
    range: {
      [definition.latest.timestampField]: {
        gte: `now-${definition.latest.lookbackPeriod}`,
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
