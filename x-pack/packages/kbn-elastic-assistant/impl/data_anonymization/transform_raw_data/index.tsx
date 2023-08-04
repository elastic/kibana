/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { getAnonymizedData } from '../get_anonymized_data';
import { getAnonymizedValues } from '../get_anonymized_values';
import { getCsvFromData } from '../get_csv_from_data';

export const transformRawData = ({
  currentReplacements,
  getAnonymizedValue,
  onNewReplacements,
  selectedPromptContext,
}: {
  currentReplacements: Record<string, string> | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  onNewReplacements?: (replacements: Record<string, string>) => void;
  selectedPromptContext: SelectedPromptContext;
}): string => {
  if (typeof selectedPromptContext.rawData === 'string') {
    return selectedPromptContext.rawData;
  }

  const anonymizedData = getAnonymizedData({
    allow: selectedPromptContext.allow,
    allowReplacement: selectedPromptContext.allowReplacement,
    currentReplacements,
    rawData: selectedPromptContext.rawData,
    getAnonymizedValue,
    getAnonymizedValues,
  });

  if (onNewReplacements != null) {
    onNewReplacements(anonymizedData.replacements);
  }

  return getCsvFromData(anonymizedData.anonymizedData);
};
