/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
          data: [
            ...contextAnonymizationFields.data.filter((f) => f.field !== field),

            {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              ...contextAnonymizationFields.data.find((f) => f.field === field)!,
              allowed: operation === 'add',
            },
          ],
        },
      };
    case 'allowReplacement':
      return {
        ...selectedPromptContext,
        contextAnonymizationFields: {
          ...contextAnonymizationFields,
          data: [
            ...contextAnonymizationFields.data.filter((f) => f.field !== field),

            {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              ...contextAnonymizationFields.data.find((f) => f.field === field)!,
              anonymized: operation === 'add',
            },
          ],
        },
      };
    default:
      return selectedPromptContext;
  }
};
