/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import type { Investigation } from '../types';
import { getTemplateBindings } from '../template_ui/template_bindings';

interface LoadState {
  investigation?: Investigation;
  isLoading: boolean;
  error?: Error;
}

export interface ConversationInvestigationState extends LoadState {
  /** Re-runs the loader, e.g. after a metadata write. */
  refresh: () => void;
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Loads the investigation backing a conversation through the loader its solution registered.
 *
 * Uses plain state rather than `useQuery` on purpose: flyout slots render outside the app's React
 * tree, so a `QueryClientProvider` is not guaranteed to be an ancestor.
 */
export const useConversationInvestigation = (
  conversation: Conversation
): ConversationInvestigationState => {
  const { id, template_id: templateId } = conversation;
  const [state, setState] = useState<LoadState>({ isLoading: true });
  const [reloadCount, setReloadCount] = useState(0);

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    const loader = getTemplateBindings(templateId)?.loadInvestigation;

    if (!loader) {
      setState({ isLoading: false });
      return;
    }

    let isCancelled = false;
    setState({ isLoading: true });

    loader(id).then(
      (investigation) => {
        if (!isCancelled) {
          setState({ investigation, isLoading: false });
        }
      },
      (error: unknown) => {
        if (!isCancelled) {
          setState({ isLoading: false, error: toError(error) });
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [id, templateId, reloadCount]);

  return { ...state, refresh };
};
