/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import type { PromptContext, SelectedPromptContext } from '../../assistant/prompt_context/types';

export async function getNewSelectedPromptContext({
  anonymizationFields,
  promptContext,
}: {
  anonymizationFields: FindAnonymizationFieldsResponse;
  promptContext: PromptContext;
}): Promise<SelectedPromptContext> {
  const rawData = await promptContext.getPromptContext();

  if (typeof rawData === 'string') {
    return {
      anonymizationFields: undefined,
      promptContextId: promptContext.id,
      rawData,
    };
  } else {
    return {
      anonymizationFields,
      promptContextId: promptContext.id,
      rawData,
    };
  }
}
