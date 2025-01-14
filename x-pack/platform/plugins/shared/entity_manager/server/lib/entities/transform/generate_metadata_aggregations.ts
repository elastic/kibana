/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';

export function generateLatestMetadataAggregations(definition: EntityDefinition) {
  if (!definition.metadata) {
    return {};
  }

  return definition.metadata.reduce((aggs, metadata) => {
    const lookbackPeriod = metadata.aggregation.lookbackPeriod || definition.latest.lookbackPeriod;
    let agg;
    if (metadata.aggregation.type === 'terms') {
      agg = {
        filter: {
          range: {
            '@timestamp': {
              gte: `now-${lookbackPeriod}`,
            },
          },
        },
        aggs: {
          data: {
            terms: {
              field: metadata.source,
              size: metadata.aggregation.limit,
            },
          },
        },
      };
    } else if (metadata.aggregation.type === 'top_value') {
      agg = {
        filter: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: `now-${lookbackPeriod}`,
                  },
                },
              },
              {
                exists: {
                  field: metadata.source,
                },
              },
            ],
          },
        },
        aggs: {
          top_value: {
            top_metrics: {
              metrics: {
                field: metadata.source,
              },
              sort: metadata.aggregation.sort,
            },
          },
        },
      };
    }

    return {
      ...aggs,
      [`entity.metadata.${metadata.destination}`]: agg,
    };
  }, {});
}
