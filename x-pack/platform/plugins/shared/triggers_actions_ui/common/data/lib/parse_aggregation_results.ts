/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchResponse,
  SearchHit,
  SearchHitsMetadata,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Group } from '@kbn/alerting-rule-utils';

export const UngroupedGroupId = 'all documents';
export interface ParsedAggregationGroup {
  group: string;
  count: number;
  hits: Array<SearchHit<unknown>>;
  sourceFields: string[];
  groups?: Group[];
  value?: number;
}

export interface ParsedAggregationResults {
  results: ParsedAggregationGroup[];
  truncated: boolean;
}

interface ParseAggregationResultsOpts {
  isCountAgg: boolean;
  isGroupAgg: boolean;
  esResult: SearchResponse<unknown>;
  resultLimit?: number;
  sourceFieldsParams?: Array<{ label: string; searchPath: string }>;
  generateSourceFieldsFromHits?: boolean;
  termField?: string | string[];
}
export const parseAggregationResults = ({
  isCountAgg,
  isGroupAgg,
  esResult,
  resultLimit,
  sourceFieldsParams = [],
  generateSourceFieldsFromHits = false,
  termField,
}: ParseAggregationResultsOpts): ParsedAggregationResults => {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg) {
    aggregations.groupAgg = {
      buckets: [
        {
          key: UngroupedGroupId,
          doc_count: totalHitsToNumber(esResult.hits.total),
          topHitsAgg: {
            hits: {
              hits: esResult.hits.hits ?? [],
            },
          },
          ...aggregations, // sourceFields
          ...(!isCountAgg
            ? {
                metricAgg: {
                  value:
                    (aggregations.metricAgg as AggregationsSingleMetricAggregateBase)?.value ?? 0,
                },
              }
            : {}),
        },
      ],
    };
  }

  // @ts-expect-error specify aggregations type explicitly
  const groupBuckets = aggregations.groupAgg?.buckets || [];
  // @ts-expect-error specify aggregations type explicitly
  const numGroupsTotal = aggregations.groupAggCount?.count ?? 0;
  const results: ParsedAggregationResults = {
    results: [],
    truncated: resultLimit ? numGroupsTotal > resultLimit : false,
  };

  for (const groupBucket of groupBuckets) {
    if (resultLimit && results.results.length === resultLimit) break;

    const groupName: string = `${groupBucket?.key}`;
    const groups =
      termField && groupBucket?.key
        ? [termField].flat().reduce<Group[]>((resultGroups, groupByItem, groupIndex) => {
            resultGroups.push({
              field: groupByItem,
              value: [groupBucket.key].flat()[groupIndex],
            });
            return resultGroups;
          }, [])
        : undefined;
    const sourceFields: { [key: string]: string[] } = {};

    sourceFieldsParams.forEach((field) => {
      if (generateSourceFieldsFromHits) {
        const fieldsSet: string[] = [];
        groupBucket.topHitsAgg.hits.hits.forEach((hit: SearchHit<{ [key: string]: string }>) => {
          if (hit._source && hit._source[field.label]) {
            fieldsSet.push(hit._source[field.label]);
          }
        });
        sourceFields[field.label] = Array.from(fieldsSet);
      } else {
        if (groupBucket[field.label]?.buckets && groupBucket[field.label].buckets.length > 0) {
          sourceFields[field.label] = groupBucket[field.label].buckets.map(
            (bucket: { doc_count: number; key: string | number }) => bucket.key
          );
        }
      }
    });

    const groupResult: any = {
      group: groupName,
      groups,
      count: groupBucket?.doc_count,
      hits: groupBucket?.topHitsAgg?.hits?.hits ?? [],
      ...(!isCountAgg ? { value: groupBucket?.metricAgg?.value } : {}),
      sourceFields,
    };
    results.results.push(groupResult);
  }

  return results;
};

function totalHitsToNumber(total: SearchHitsMetadata['total']): number {
  return typeof total === 'number' ? total : total?.value ?? 0;
}
