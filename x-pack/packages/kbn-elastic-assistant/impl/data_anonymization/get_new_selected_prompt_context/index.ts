/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { isAllowed, isAnonymized } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { PromptContext, SelectedPromptContext } from '../../assistant/prompt_context/types';

export async function getNewSelectedPromptContext({
  anonymizationFields,
  promptContext,
}: {
  anonymizationFields?: FindAnonymizationFieldsResponse;
  promptContext: PromptContext;
}): Promise<SelectedPromptContext> {
  const rawData = await promptContext.getPromptContext();

  if (typeof rawData === 'string') {
    return {
      contextAnonymizationFields: undefined,
      promptContextId: promptContext.id,
      rawData,
    };
  } else {
    const extendedAnonymizationData = Object.keys(rawData).reduce<AnonymizationFieldResponse[]>(
      (acc, field) => [
        ...acc,
        {
          id: field,
          field,
          allowed: isAllowed({ anonymizationFields: anonymizationFields?.data ?? [], field }),
          anonymized: isAnonymized({
            anonymizationFields: anonymizationFields?.data ?? [],
            field,
          }),
        },
      ],
      []
    );
    return {
      contextAnonymizationFields: {
        page: 1,
        perPage: 100,
        total: extendedAnonymizationData.length,
        data: extendedAnonymizationData,
      },
      promptContextId: promptContext.id,
      rawData,
    };
  }
}
