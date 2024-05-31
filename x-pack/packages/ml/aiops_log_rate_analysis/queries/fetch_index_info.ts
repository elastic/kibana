/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getTotalDocCountRequest } from './get_total_doc_count_request';

// TODO Consolidate with duplicate `fetchPValues` in
// `x-pack/plugins/observability_solution/apm/server/routes/correlations/queries/fetch_duration_field_candidates.ts`

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

const SUPPORTED_ES_FIELD_TYPES_TEXT = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.MATCH_ONLY_TEXT];

interface IndexInfo {
  fieldCandidates: string[];
  textFieldCandidates: string[];
  baselineTotalDocCount: number;
  deviationTotalDocCount: number;
  zeroDocsFallback: boolean;
}

export const fetchIndexInfo = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  textFieldCandidatesOverrides: string[] = [],
  abortSignal?: AbortSignal
): Promise<IndexInfo> => {
  const { index } = params;
  // Get all supported fields
  const respMapping = await esClient.fieldCaps(
    {
      fields: '*',
      filters: '-metadata',
      include_empty_fields: false,
      index,
      index_filter: {
        range: {
          [params.timeFieldName]: {
            gte: params.deviationMin,
            lte: params.deviationMax,
          },
        },
      },
      types: [...SUPPORTED_ES_FIELD_TYPES, ...SUPPORTED_ES_FIELD_TYPES_TEXT],
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const allFieldNames: string[] = [];

  const acceptableFields: Set<string> = new Set();
  const acceptableTextFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));
    const isAggregatable = fieldTypes.some((type) => value[type].aggregatable);
    const isTextField = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES_TEXT.includes(type));

    // Check if fieldName is something we can aggregate on
    if (isSupportedType && isAggregatable) {
      acceptableFields.add(key);
    }

    if (isTextField) {
      acceptableTextFields.add(key);
    }

    allFieldNames.push(key);
  });

  // Get the total doc count for the baseline time range
  const respBaselineTotalDocCount = await esClient.search(
    getTotalDocCountRequest({ ...params, start: params.baselineMin, end: params.baselineMax }),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  // Get the total doc count for the deviation time range
  const respDeviationTotalDocCount = await esClient.search(
    getTotalDocCountRequest({ ...params, start: params.deviationMin, end: params.deviationMax }),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  const textFieldCandidatesOverridesWithKeywordPostfix = textFieldCandidatesOverrides.map(
    (d) => `${d}.keyword`
  );

  const fieldCandidates: string[] = [...acceptableFields].filter(
    (field) => !textFieldCandidatesOverridesWithKeywordPostfix.includes(field)
  );
  const textFieldCandidates: string[] = [...acceptableTextFields].filter((field) => {
    const fieldName = field.replace(new RegExp(/\.text$/), '');
    return (
      (!fieldCandidates.includes(fieldName) && !fieldCandidates.includes(`${fieldName}.keyword`)) ||
      textFieldCandidatesOverrides.includes(field)
    );
  });

  const baselineTotalDocCount = (respBaselineTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;
  const deviationTotalDocCount = (respDeviationTotalDocCount.hits.total as estypes.SearchTotalHits)
    .value;

  return {
    fieldCandidates: fieldCandidates.sort(),
    textFieldCandidates: textFieldCandidates.sort(),
    baselineTotalDocCount,
    deviationTotalDocCount,
    zeroDocsFallback: baselineTotalDocCount === 0 || deviationTotalDocCount === 0,
  };
};
