/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';

import { SelectedPromptContext } from '../../../assistant/prompt_context/types';
import { ContextEditorRow } from '../types';

export const getRows = ({
  allow,
  allowReplacement,
  rawData,
}: {
  allow: SelectedPromptContext['allow'];
  allowReplacement: SelectedPromptContext['allowReplacement'];
  rawData: Record<string, string[]> | null;
}): ContextEditorRow[] => {
  const allowReplacementSet = new Set(allowReplacement);
  const allowSet = new Set(allow);

  if (rawData !== null && typeof rawData === 'object') {
    const rawFields = Object.keys(rawData).sort();

    return rawFields.reduce<ContextEditorRow[]>(
      (acc, field) => [
        ...acc,
        {
          field,
          allowed: isAllowed({ allowSet, field }),
          anonymized: isAnonymized({ allowReplacementSet, field }),
          denied: isDenied({ allowSet, field }),
          rawValues: rawData[field],
        },
      ],
      []
    );
  } else {
    return allow.sort().reduce<ContextEditorRow[]>(
      (acc, field) => [
        ...acc,
        {
          field,
          allowed: true,
          anonymized: allowReplacementSet.has(field),
          denied: false,
          rawValues: [],
        },
      ],
      []
    );
  }
};
