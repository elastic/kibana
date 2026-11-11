/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContentListItems, useContentListPhase } from '@kbn/content-list-provider';

export type AiIndexListMode = 'loading' | 'error' | 'empty' | 'onboarding' | 'browse';

export const useAiIndexListMode = (
  hasCustomAiIndices: boolean,
  isLoading: boolean
): { mode: AiIndexListMode; error?: Error } => {
  const phase = useContentListPhase();
  const { error } = useContentListItems();

  if (error) {
    return { mode: 'error', error };
  }
  if (isLoading || phase === 'initialLoad') {
    return { mode: 'loading' };
  }
  if (phase === 'empty') {
    return { mode: 'empty' };
  }
  return { mode: hasCustomAiIndices ? 'browse' : 'onboarding' };
};
