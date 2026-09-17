/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { EditableAiIndexTrace } from '../components/trace_selector';
import { useSaveAiIndexTraces } from './use_save_ai_index_traces';

/** The draft only exists while editing, so it cannot outlive an edit session. */
type TracesEditorState =
  | { status: 'idle' }
  | { status: 'editing'; draft: EditableAiIndexTrace | undefined };

type TracesEditorAction =
  | { type: 'editStarted'; draft: EditableAiIndexTrace | undefined }
  | { type: 'editStopped' }
  | { type: 'draftChanged'; draft: EditableAiIndexTrace | undefined };

const IDLE: TracesEditorState = { status: 'idle' };

const toEditableTrace = (
  aiIndex: GetAiIndexResponse | undefined
): EditableAiIndexTrace | undefined => {
  const trace = aiIndex?.traces[0];
  if (trace?.type === 'elastic_agent' || trace?.type === 'index') {
    return { type: trace.type, value: trace.value };
  }
  return undefined;
};

const reducer = (state: TracesEditorState, action: TracesEditorAction): TracesEditorState => {
  switch (action.type) {
    case 'editStarted':
      return { status: 'editing', draft: action.draft };
    case 'editStopped':
      return IDLE;
    case 'draftChanged':
      if (state.status !== 'editing') {
        return state;
      }
      return { status: 'editing', draft: action.draft };
    default:
      return state;
  }
};

interface UseTracesEditorParams {
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export interface TracesEditorEditingControls {
  draft: EditableAiIndexTrace | undefined;
  setDraft: (draft: EditableAiIndexTrace | undefined) => void;
  isSaving: boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

export interface UseTracesEditorResult {
  /** The persisted trace shown in read-only mode. */
  currentTrace: EditableAiIndexTrace | undefined;
  startEditing: () => void;
  /** Present only while editing. */
  editing: TracesEditorEditingControls | undefined;
}

export const useTracesEditor = ({
  aiIndex,
  onSaved,
}: UseTracesEditorParams): UseTracesEditorResult => {
  const [state, dispatch] = useReducer(reducer, IDLE);
  const { saveTraces, isSaving } = useSaveAiIndexTraces();

  const currentTrace = useMemo(() => toEditableTrace(aiIndex), [aiIndex]);

  const startEditing = useCallback(
    () => dispatch({ type: 'editStarted', draft: currentTrace }),
    [currentTrace]
  );

  const cancel = useCallback(() => dispatch({ type: 'editStopped' }), []);

  const setDraft = useCallback(
    (nextDraft: EditableAiIndexTrace | undefined) =>
      dispatch({ type: 'draftChanged', draft: nextDraft }),
    []
  );

  const save = useCallback(async () => {
    if (state.status !== 'editing' || !aiIndex) {
      return;
    }
    const saved = await saveTraces(aiIndex, state.draft);
    if (saved) {
      dispatch({ type: 'editStopped' });
      onSaved();
    }
  }, [aiIndex, onSaved, saveTraces, state]);

  const editing =
    state.status === 'editing'
      ? { draft: state.draft, setDraft, isSaving, save, cancel }
      : undefined;

  return {
    currentTrace,
    startEditing,
    editing,
  };
};
