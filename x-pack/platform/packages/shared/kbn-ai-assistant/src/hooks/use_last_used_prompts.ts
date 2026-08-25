/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './use_local_storage';

const AI_ASSISTANT_LAST_USED_PROMPT_STORAGE = 'kibana.ai-assistant.last-used-prompts';

export function useLastUsedPrompts() {
  const [lastUsedPrompts, setPrompt] = useLocalStorage<string[]>(
    AI_ASSISTANT_LAST_USED_PROMPT_STORAGE,
    []
  );

  const addLastUsedPrompt = useCallback(
    (prompt: string) => setPrompt(uniq([prompt, ...lastUsedPrompts]).slice(0, 5)),
    [lastUsedPrompts, setPrompt]
  );

  return useMemo(
    () => ({ lastUsedPrompts, addLastUsedPrompt }),
    [addLastUsedPrompt, lastUsedPrompts]
  );
}
