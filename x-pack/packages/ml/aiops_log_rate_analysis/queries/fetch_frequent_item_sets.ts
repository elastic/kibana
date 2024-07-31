/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, pick, isEqual } from 'lodash';
import { group } from 'd3-array';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ItemSet, SignificantItem } from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { RANDOM_SAMPLER_SEED, LOG_RATE_ANALYSIS_SETTINGS } from '../constants';
import type { SignificantItemDuplicateGroup, FetchFrequentItemSetsResponse } from '../types';

interface FrequentItemSetsAggregation extends estypes.AggregationsSamplerAggregation {
  fi: {
    buckets: Array<{ key: Record<string, string[]>; doc_count: number; support: number }>;
  };
}

export function groupDuplicates(
  cps: SignificantItem[],
  uniqueFields: Array<keyof SignificantItem>
) {
  const groups: SignificantItemDuplicateGroup[] = [];

  for (const cp of cps) {
    const compareAttributes = pick(cp, uniqueFields);

    const groupIndex = groups.findIndex((g) => isEqual(g.keys, compareAttributes));
    if (groupIndex === -1) {
      groups.push({
        keys: compareAttributes,
        group: [cp],
      });
    } else {
      groups[groupIndex].group.push(cp);
    }
  }

  return groups;
}

/**
 * Creates ES bool should clauses for each provided significant item.
 * In previous versions of this helper we grouped values for the same field
 * in a `terms` agg, but this might clash with the `minimum_should_match: 2` clause
 * used in the query for the `frequent_item_sets`, because even multiple matches within
 * the `terms` agg would count as just 1 match in the outer `should` part.
 *
 * @param significantItems
 * @returns an array of term filters
 */
export function getShouldClauses(significantItems: SignificantItem[]) {
  return significantItems.map((d) => ({ term: { [d.fieldName]: d.fieldValue } }));
}

/**
 * Creates a filter for each field to be used in the `frequent_items_sets` agg.
 * Considers a limit per field to work around scaling limitations of the agg.
 *
 * @param significantItems
 * @returns field filter for the `frequent_item_sets` agg
 */
export function getFrequentItemSetsAggFields(significantItems: SignificantItem[]) {
  return Array.from(
    group(significantItems, ({ fieldName }) => fieldName),
    ([field, values]) => ({
      field,
      include: values
        .map((d) => String(d.fieldValue))
        .slice(0, LOG_RATE_ANALYSIS_SETTINGS.FREQUENT_ITEMS_SETS_FIELD_VALUE_LIMIT),
    })
  );
}

export async function fetchFrequentItemSets({
  esClient,
  abortSignal,
  emitError,
  logger,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  emitError: (m: string) => void;
  abortSignal?: AbortSignal;
  logger: Logger;
  arguments: {
    index: string;
    searchQuery: estypes.QueryDslQueryContainer;
    significantItems: SignificantItem[];
    timeFieldName: string;
    deviationMin: number;
    deviationMax: number;
    sampleProbability?: number;
  };
}): Promise<FetchFrequentItemSetsResponse> {
  const {
    index,
    searchQuery,
    significantItems,
    timeFieldName,
    deviationMin,
    deviationMax,
    // The default value of 1 means no sampling will be used
    sampleProbability = 1,
  } = args;

  // Sort significant terms by ascending p-value, necessary to apply the field limit correctly.
  const sortedSignificantItems = significantItems.slice().sort((a, b) => {
    return (a.pValue ?? 0) - (b.pValue ?? 0);
  });

  const query = {
    bool: {
      minimum_should_match: 2,
      filter: [
        searchQuery,
        {
          range: {
            [timeFieldName]: {
              gte: deviationMin,
              lt: deviationMax,
            },
          },
        },
      ],
      should: getShouldClauses(sortedSignificantItems),
    },
  };

  const frequentItemSetsAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    fi: {
      frequent_item_sets: {
        minimum_set_size: 2,
        size: 200,
        minimum_support: LOG_RATE_ANALYSIS_SETTINGS.FREQUENT_ITEMS_SETS_MINIMUM_SUPPORT,
        fields: getFrequentItemSetsAggFields(sortedSignificantItems),
      },
    },
  };

  const { wrap, unwrap } = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const esBody = {
    query,
    aggs: wrap(frequentItemSetsAgg),
    size: 0,
    track_total_hits: true,
  };

  const body = await esClient.search<
    unknown,
    { sample: FrequentItemSetsAggregation } | FrequentItemSetsAggregation
  >(
    {
      index,
      size: 0,
      body: esBody,
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  if (body.aggregations === undefined) {
    logger.error(`Failed to fetch frequent_item_sets, got: \n${JSON.stringify(body, null, 2)}`);
    emitError(`Failed to fetch frequent_item_sets.`);
    return {
      fields: [],
      itemSets: [],
      totalDocCount: 0,
    };
  }

  const totalDocCountFi = (body.hits.total as estypes.SearchTotalHits).value;

  const frequentItemSets = unwrap(
    body.aggregations as Record<string, estypes.AggregationsAggregate>
  ) as FrequentItemSetsAggregation;

  const shape = frequentItemSets.fi.buckets.length;
  let maximum = shape;
  if (maximum > 50000) {
    maximum = 50000;
  }

  const fiss = frequentItemSets.fi.buckets;
  fiss.length = maximum;

  const results: ItemSet[] = [];

  fiss.forEach((fis) => {
    const result: ItemSet = {
      set: [],
      size: 0,
      maxPValue: 0,
      doc_count: 0,
      support: 0,
      total_doc_count: 0,
    };
    let maxPValue: number | undefined;
    Object.entries(fis.key).forEach(([key, values]) => {
      values.forEach((value) => {
        result.set.push({ fieldName: key, fieldValue: value });

        const pValue = sortedSignificantItems.find(
          (t) => t.fieldName === key && t.fieldValue === value
        )?.pValue;

        if (pValue !== undefined && pValue !== null) {
          maxPValue = Math.max(maxPValue ?? 0, pValue);
        }
      });
    });

    if (maxPValue === undefined) {
      return;
    }

    result.size = Object.keys(result.set).length;
    result.maxPValue = maxPValue;
    result.doc_count = fis.doc_count;
    result.support = fis.support;
    result.total_doc_count = totalDocCountFi;

    results.push(result);
  });

  results.sort((a, b) => {
    return b.doc_count - a.doc_count;
  });

  const uniqueFields = uniq(results.flatMap((r) => r.set.map((d) => d.fieldName)));

  return {
    fields: uniqueFields,
    itemSets: results,
    totalDocCount: totalDocCountFi,
  };
}
