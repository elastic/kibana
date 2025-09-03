/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';

export const getIsDataAnonymizable = (rawData: string | Record<string, string[]>): boolean =>
  typeof rawData !== 'string';

export interface Stats {
  allowed: number;
  anonymized: number;
  denied: number;
  total: number;
}

export const updateSelectedPromptContext = ({
  field,
  operation,
  selectedPromptContext,
  update,
}: {
  field: string;
  operation: 'add' | 'remove';
  selectedPromptContext: SelectedPromptContext;
  update:
    | 'allow'
    | 'allowReplacement'
    | 'defaultAllow'
    | 'defaultAllowReplacement'
    | 'deny'
    | 'denyReplacement';
}): SelectedPromptContext => {
  const { contextAnonymizationFields } = selectedPromptContext;
  if (!contextAnonymizationFields) {
    return selectedPromptContext;
  }

  switch (update) {
    case 'allow':
      return {
        ...selectedPromptContext,
        contextAnonymizationFields: {
          ...contextAnonymizationFields,
          data: contextAnonymizationFields.data.reduce<FindAnonymizationFieldsResponse['data']>(
            (acc, currentField) => {
              if (currentField.field === field) {
                return [...acc, { ...currentField, allowed: operation === 'add' }];
              }
              return [...acc, currentField];
            },
            []
          ),
        },
      };
    case 'allowReplacement':
      return {
        ...selectedPromptContext,
        contextAnonymizationFields: {
          ...contextAnonymizationFields,
          data: contextAnonymizationFields.data.reduce<FindAnonymizationFieldsResponse['data']>(
            (acc, currentField) => {
              if (currentField.field === field) {
                return [...acc, { ...currentField, anonymized: operation === 'add' }];
              }
              return [...acc, currentField];
            },
            []
          ),
        },
      };
    default:
      return selectedPromptContext;
  }
};
