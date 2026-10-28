/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
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

interface Draft {
  aiIndexId: string;
  initialSources: SelectedSource[];
  selectedSources: SelectedSource[];
}

/**
 * sources. The draft is seeded from `aiIndex` as soon as it loads (or reloads under a different id),
 * and survives saves so the picker stays editable without a separate view mode.
 */
export const useSourcesEditor = ({
  aiIndex,
  onSaved,
}: UseSourcesEditorParams): SourcesEditorEditingControls => {
  const [draft, setDraft] = useState<Draft>();
  const { saveSources, isSaving } = useSaveAiIndexSources();

  if (aiIndex === undefined) {
    if (draft !== undefined) {
      setDraft(undefined);
    }
  } else if (draft?.aiIndexId !== aiIndex.id) {
    const initialSources = toSelectedSources(aiIndex.sources);
    setDraft({ aiIndexId: aiIndex.id, initialSources, selectedSources: initialSources });
  }

  const cancel = useCallback(() => {
    setDraft((current) =>
      current ? { ...current, selectedSources: current.initialSources } : current
    );
  }, []);

  const setSelectedSources = useCallback(
    (selectedSources: SelectedSource[]) => {
      if (isSaving) {
        return;
      }
      setDraft((current) => (current ? { ...current, selectedSources } : current));
    },
    [isSaving]
  );

  const hasChanges = useMemo(() => {
    if (!draft) {
      return false;
    }
    return !areSourceSelectionsEqual(draft.selectedSources, draft.initialSources);
  }, [draft]);

  const save = useCallback(async () => {
    if (!draft || !aiIndex) {
      return;
    }
    const startedDraft = draft;
    const saved = await saveSources(aiIndex, draft.selectedSources);
    if (saved) {
      setDraft((current) =>
        current === startedDraft ? { ...current, initialSources: current.selectedSources } : current
      );
      onSaved();
    }
  }, [aiIndex, draft, onSaved, saveSources]);

  return {
    selectedSources: draft?.selectedSources ?? [],
    setSelectedSources,
    hasChanges,
    isSaving,
    save,
    cancel,
  };
};
