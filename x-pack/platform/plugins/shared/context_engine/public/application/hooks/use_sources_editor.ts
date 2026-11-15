/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SelectedSource } from '../components/source_picker';
import { areSourceSelectionsEqual, toSelectedSources } from '../utils/sources';
import { useSaveAiIndexSources } from './use_save_ai_index_sources';

interface UseSourcesEditorParams {
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export interface SourcesEditorEditingControls {
  selectedSources: SelectedSource[];
  setSelectedSources: (sources: SelectedSource[]) => void;
  hasChanges: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

export interface UseSourcesEditorResult {
  startEditing: () => void;
  editing: SourcesEditorEditingControls | undefined;
}

export const useSourcesEditor = ({
  aiIndex,
  onSaved,
}: UseSourcesEditorParams): UseSourcesEditorResult => {
  const [session, setSession] = useState<{
    initialSources: SelectedSource[];
    selectedSources: SelectedSource[];
  }>();
  const { saveSources, isSaving } = useSaveAiIndexSources();

  // Discard a stale session if the route switches to a different AI index.
  useEffect(() => {
    setSession(undefined);
  }, [aiIndex?.id]);

  const startEditing = useCallback(() => {
    const initialSources = toSelectedSources(aiIndex?.sources ?? []);
    setSession({ initialSources, selectedSources: initialSources });
  }, [aiIndex?.sources]);

  const cancel = useCallback(() => setSession(undefined), []);

  const setSelectedSources = useCallback(
    (selectedSources: SelectedSource[]) => {
      if (isSaving) {
        return;
      }
      setSession((current) => (current ? { ...current, selectedSources } : current));
    },
    [isSaving]
  );

  const hasChanges = useMemo(() => {
    if (!session) {
      return false;
    }
    return !areSourceSelectionsEqual(session.selectedSources, session.initialSources);
  }, [session]);

  const save = useCallback(async () => {
    if (!session || !aiIndex) {
      return;
    }
    const startedSession = session;
    const saved = await saveSources(aiIndex, session.selectedSources);
    if (saved) {
      setSession((current) => (current === startedSession ? undefined : current));
      onSaved();
    }
  }, [aiIndex, onSaved, saveSources, session]);

  return {
    startEditing,
    editing: session
      ? {
          selectedSources: session.selectedSources,
          setSelectedSources,
          hasChanges,
          isSaving,
          save,
          cancel,
        }
      : undefined,
  };
};
