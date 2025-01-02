/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';

import type { PromptContext } from '../assistant/prompt_context/types';

export const getUniquePromptContextId = (): string => v4();

export const updatePromptContexts = ({
  prevPromptContexts,
  promptContext,
}: {
  prevPromptContexts: Record<string, PromptContext>;
  promptContext: PromptContext;
}): Record<string, PromptContext> => ({
  ...prevPromptContexts,
  [promptContext.id]: {
    ...promptContext,
  },
});
