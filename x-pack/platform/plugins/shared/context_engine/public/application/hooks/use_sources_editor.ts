/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AiIndexSource, GetAiIndexResponse } from '../../../common/http_api/ai_indices';
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
  /** The `aiIndex.sources` array this draft was last synced against, compared by reference. */
  persistedSources: AiIndexSource[];
  initialSources: SelectedSource[];
  selectedSources: SelectedSource[];
}

/** Rebuilds a fresh draft from an AI index's persisted sources. */
const reseedDraft = (aiIndex: GetAiIndexResponse): Draft => {
  const initialSources = toSelectedSources(aiIndex.sources);
  return {
    aiIndexId: aiIndex.id,
    persistedSources: aiIndex.sources,
    initialSources,
    selectedSources: initialSources,
  };
};

/**
 * Manages a local draft of an AI index's sources for editing. The draft is seeded from `aiIndex`
 * as soon as it loads (or reloads under a different id), and survives saves so the picker stays
 * editable without a separate view mode.
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
  } else if (draft === undefined || draft.aiIndexId !== aiIndex.id) {
    // No draft yet, or switched to a different AI index: start from its persisted sources.
    setDraft(reseedDraft(aiIndex));
  } else if (draft.persistedSources !== aiIndex.sources) {
    // Reference check, not content: avoids reverting to stale sources on the re-render right after save.
    const isUnedited = areSourceSelectionsEqual(draft.selectedSources, draft.initialSources);
    // Only resync over unedited drafts; never clobber unsaved edits.
    setDraft(isUnedited ? reseedDraft(aiIndex) : { ...draft, persistedSources: aiIndex.sources });
  }

  const cancel = useCallback(() => {
    setDraft((current) =>
      current ? { ...current, selectedSources: current.initialSources } : current
    );
  }, []);

  const setSelectedSources = useCallback((selectedSources: SelectedSource[]) => {
    setDraft((current) => (current ? { ...current, selectedSources } : current));
  }, []);

  const hasChanges = useMemo(() => {
    if (!draft) {
      return false;
    }
    return !areSourceSelectionsEqual(draft.selectedSources, draft.initialSources);
  }, [draft]);

  const save = useCallback(async () => {
    if (!draft || !aiIndex || isSaving) {
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
  }, [aiIndex, draft, isSaving, onSaved, saveSources]);

  return {
    selectedSources: draft?.selectedSources ?? [],
    setSelectedSources,
    hasChanges,
    isSaving,
    save,
    cancel,
  };
};
