/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { isAllowed } from '../../data_anonymization_editor/helpers';
import type { AnonymizedData, GetAnonymizedValues } from '../types';

export const getAnonymizedData = ({
  allow,
  allowReplacement,
  currentReplacements,
  getAnonymizedValue,
  getAnonymizedValues,
  rawData,
}: {
  allow: SelectedPromptContext['allow'];
  allowReplacement: SelectedPromptContext['allowReplacement'];
  currentReplacements: Record<string, string> | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  getAnonymizedValues: GetAnonymizedValues;
  rawData: Record<string, string[]>;
}): AnonymizedData =>
  Object.keys(rawData).reduce<AnonymizedData>(
    (acc, field) => {
      const allowReplacementSet = new Set(allowReplacement);
      const allowSet = new Set(allow);

      if (isAllowed({ allowSet, field })) {
        const { anonymizedValues, replacements } = getAnonymizedValues({
          allowReplacementSet,
          allowSet,
          currentReplacements,
          field,
          getAnonymizedValue,
          rawData,
        });

        return {
          anonymizedData: {
            ...acc.anonymizedData,
            [field]: anonymizedValues,
          },
          replacements: {
            ...acc.replacements,
            ...replacements,
          },
        };
      } else {
        return acc;
      }
    },
    {
      anonymizedData: {},
      replacements: {},
    }
  );
