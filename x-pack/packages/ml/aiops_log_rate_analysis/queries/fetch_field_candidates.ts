/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import { containsECSIdentifierFields, filterByECSFields } from '../ecs_fields';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import {
  SUPPORTED_ES_FIELD_TYPES,
  SUPPORTED_ES_FIELD_TYPES_TEXT,
  TEXT_FIELD_WHITE_LIST,
} from './fetch_index_info';

interface FetchFieldCandidatesParams {
  esClient: ElasticsearchClient;
  abortSignal?: AbortSignal;
  arguments: AiopsLogRateAnalysisSchema<'2'> & {
    textFieldCandidatesOverrides: string[];
  };
}

interface FetchFieldCandidatesResponse {
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

    if (isTextField && TEXT_FIELD_WHITE_LIST.includes(key)) {
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

  return {
    // all keyword field candidates
    keywordFieldCandidates: keywordFieldCandidates.sort(),
    // preselection:
    // - if we identify an ECS schema, filter by custom ECS whitelist
    // - if not, take the first 100 fields
    selectedKeywordFieldCandidates: containsECSIdentifierFields(keywordFieldCandidates)
      ? filterByECSFields(keywordFieldCandidates).sort()
      : keywordFieldCandidates.sort().slice(0, 100),
    // text field candidates
    textFieldCandidates: textFieldCandidates.sort(),
    selectedTextFieldCandidates: textFieldCandidates.sort(),
  };
};
