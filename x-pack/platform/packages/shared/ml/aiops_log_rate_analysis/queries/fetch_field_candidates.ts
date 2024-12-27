/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ES_FIELD_TYPES } from '@kbn/field-types';

import { containsECSIdentifierField, filterByECSFields } from '../ecs_fields';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

// Supported field names for text fields for log rate analysis.
// If we analyse all detected text fields, we might run into performance
// issues with the `categorize_text` aggregation. Until this is resolved, we
// rely on a predefined white list of supported text fields.
export const TEXT_FIELD_SAFE_LIST = ['message', 'error.message'];

export const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  // Disabled boolean support because it causes problems with the `frequent_item_sets` aggregation
  // ES_FIELD_TYPES.BOOLEAN,
];

export const SUPPORTED_ES_FIELD_TYPES_TEXT = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.MATCH_ONLY_TEXT];

// This override is meant to be used to force certain fields to be considered as
// text fields when both text and keyword type is available.
export interface FetchFieldCandidatesParamsArguments {
  textFieldCandidatesOverrides?: string[];
}

export interface FetchFieldCandidatesParams {
  esClient: ElasticsearchClient;
  abortSignal?: AbortSignal;
  arguments: AiopsLogRateAnalysisSchema & FetchFieldCandidatesParamsArguments;
}

export interface FetchFieldCandidatesResponse {
  isECS: boolean;
  keywordFieldCandidates: string[];
  selectedKeywordFieldCandidates: string[];
  textFieldCandidates: string[];
  selectedTextFieldCandidates: string[];
}

export const fetchFieldCandidates = async ({
  esClient,
  abortSignal,
  arguments: args,
}: FetchFieldCandidatesParams): Promise<FetchFieldCandidatesResponse> => {
  const { textFieldCandidatesOverrides = [], ...params } = args;

  // Get all supported fields
  const respMapping = await esClient.fieldCaps(
    {
      fields: '*',
      filters: '-metadata,-parent',
      include_empty_fields: false,
      index: params.index,
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

    if (isTextField && TEXT_FIELD_SAFE_LIST.includes(key)) {
      acceptableTextFields.add(key);
    }

    allFieldNames.push(key);
  });

  const textFieldCandidatesOverridesWithKeywordPostfix = textFieldCandidatesOverrides.map(
    (d) => `${d}.keyword`
  );

  const keywordFieldCandidates: string[] = [...acceptableFields].filter(
    (field) => !textFieldCandidatesOverridesWithKeywordPostfix.includes(field)
  );
  const textFieldCandidates: string[] = [...acceptableTextFields].filter((field) => {
    const fieldName = field.replace(new RegExp(/\.text$/), '');
    return (
      (!keywordFieldCandidates.includes(fieldName) &&
        !keywordFieldCandidates.includes(`${fieldName}.keyword`)) ||
      textFieldCandidatesOverrides.includes(field)
    );
  });

  const isECS = containsECSIdentifierField(keywordFieldCandidates);

  return {
    isECS,
    // all keyword field candidates
    keywordFieldCandidates: keywordFieldCandidates.sort(),
    // preselection:
    // - if we identify an ECS schema, filter by custom ECS safe list
    // - if not, take the first 100 fields
    selectedKeywordFieldCandidates: isECS
      ? filterByECSFields(keywordFieldCandidates).sort()
      : keywordFieldCandidates.sort().slice(0, 100),
    // text field candidates
    textFieldCandidates: textFieldCandidates.sort(),
    selectedTextFieldCandidates: textFieldCandidates.sort(),
  };
};
