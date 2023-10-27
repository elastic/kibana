/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptContext, SelectedPromptContext } from '../../assistant/prompt_context/types';

export async function getNewSelectedPromptContext({
  defaultAllow,
  defaultAllowReplacement,
  promptContext,
}: {
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  promptContext: PromptContext;
}): Promise<SelectedPromptContext> {
  const rawData = await promptContext.getPromptContext();

  if (typeof rawData === 'string') {
    return {
      allow: [],
      allowReplacement: [],
      promptContextId: promptContext.id,
      rawData,
    };
  } else {
    return {
      allow: [...defaultAllow],
      allowReplacement: [...defaultAllowReplacement],
      promptContextId: promptContext.id,
      rawData,
    };
  }
}
