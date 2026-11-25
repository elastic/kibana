/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { EditableAiIndexTrace } from '../components/trace_selector';
import { useSaveAiIndexTraces } from './use_save_ai_index_traces';

type Draft = EditableAiIndexTrace | undefined;

const toEditableTrace = (aiIndex: GetAiIndexResponse | undefined): Draft => {
  const trace = aiIndex?.traces[0];
  if (!trace || trace.type === 'esql') {
    return undefined;
  }
  return { type: trace.type, value: trace.value };
};

interface UseTracesEditorParams {
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export interface TracesEditorEditingControls {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  isSaving: boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

export interface UseTracesEditorResult {
  currentTrace: Draft;
  startEditing: () => void;
  editing: TracesEditorEditingControls | undefined;
}

export const useTracesEditor = ({
  aiIndex,
  onSaved,
}: UseTracesEditorParams): UseTracesEditorResult => {
  const [session, setSession] = useState<{ draft: Draft }>();
  const { saveTraces, isSaving } = useSaveAiIndexTraces();
  const currentTrace = toEditableTrace(aiIndex);

  const startEditing = () => setSession({ draft: currentTrace });
  const cancel = () => setSession(undefined);
  const setDraft = (draft: Draft) => {
    setSession((current) => (current ? { draft } : current));
  };

  const save = async () => {
    if (!session || !aiIndex) {
      return;
    }
    const saved = await saveTraces(aiIndex, session.draft);
    if (saved) {
      setSession(undefined);
      onSaved();
    }
  };

  return {
    currentTrace,
    startEditing,
    editing: session ? { draft: session.draft, setDraft, isSaving, save, cancel } : undefined,
  };
};
