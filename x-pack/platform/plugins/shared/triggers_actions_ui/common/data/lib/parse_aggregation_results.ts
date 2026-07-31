/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchResponse,
  SearchHit,
  SearchHitsMetadata,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/types';
import type { Group } from '@kbn/alerting-rule-utils';
import { get } from 'lodash';

export const UngroupedGroupId = 'all documents';
export interface ParsedAggregationGroup {
  group: string;
  count: number;
  hits: Array<SearchHit<unknown>>;
  sourceFields: Record<string, string[]>;
  groups?: Group[];
  groupingObject?: Record<string, unknown>;
  value?: number;
}

/**
 * Shape of a single `groupAgg` bucket consumed by {@link parseAggregationResults}.
 */
export interface ParsedAggregationBucket {
  key: string | Array<string | null>;
  keyFields?: string[];
  doc_count: number;
  topHitsAgg?: {
    hits?: {
      hits: Array<SearchHit<unknown>>;
    };
  };
  metricAgg?: {
    value?: number | null;
  };
}

interface ParsedAggregations {
  groupAgg?: { buckets?: ParsedAggregationBucket[] };
  groupAggCount?: { count?: number };
  metricAgg?: AggregationsSingleMetricAggregateBase;
}

export interface ParsedAggregationResults {
  results: ParsedAggregationGroup[];
  truncated: boolean;
}

export interface ParseAggregationResultsOpts {
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
  // `esResult.aggregations` is the opaque ES `Record<string, AggregationsAggregate>`;
  // narrow it once to the sub-aggregations this parser actually uses.
  const aggregations = (esResult?.aggregations ?? {}) as ParsedAggregations;

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
                  value: aggregations.metricAgg?.value ?? 0,
                },
              }
            : {}),
        },
      ],
    };
  }

  const groupBuckets = aggregations.groupAgg?.buckets ?? [];
  const numGroupsTotal = aggregations.groupAggCount?.count ?? 0;
  const results: ParsedAggregationResults = {
    results: [],
    truncated: resultLimit ? numGroupsTotal > resultLimit : false,
  };

  for (const groupBucket of groupBuckets) {
    if (resultLimit && results.results.length === resultLimit) break;

    const groupName = `${groupBucket?.key}`;
    // group buckets may carry their own field names in keyFields when its key values were filtered
    const groupFields = groupBucket?.keyFields ?? termField;
    const groupKeys = [groupFields ?? []].flat();
    const groupValues = [groupBucket.key].flat();
    const groups =
      groupFields && groupBucket?.key
        ? groupKeys.reduce<Group[]>((resultGroups, groupByItem, groupIndex) => {
            resultGroups.push({
              field: groupByItem,
              value: `${groupValues[groupIndex]}`,
            });
            return resultGroups;
          }, [])
        : undefined;
    const groupingObject =
      groupFields && groupBucket?.key
        ? groupKeys.reduce<Record<string, unknown>>((resultGroups, groupByItem, groupIndex) => {
            resultGroups[groupByItem] = groupValues[groupIndex];
            return resultGroups;
          }, {})
        : undefined;
    const sourceFields: { [key: string]: string[] } = {};
    if (generateSourceFieldsFromHits) {
      sourceFieldsParams.forEach((field) => {
        const fields: string[] = [];
        const hits = groupBucket?.topHitsAgg?.hits?.hits ?? [];
        hits.forEach((hit) => {
          const sourceField = get(hit._source, field.label);
          if (sourceField) {
            fields.push(sourceField);
          }
        });
        if (fields.length > 0) {
          const isArray = Array.isArray(fields);
          const fieldsSet = new Set<string>(isArray ? fields.flat() : fields);
          sourceFields[field.label] = Array.from(fieldsSet);
        }
      });
    }

    const groupResult: any = {
      group: groupName,
      groups,
      groupingObject,
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
