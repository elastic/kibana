/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import type { AiIndexAutomation, GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { buildStarterWorkflowYaml } from '../utils/starter_workflow_yaml';
import { useCreateWorkflow } from './use_create_workflow';
import { useSaveAiIndexAutomations } from './use_save_ai_index_automations';

/** The draft only exists while editing, so it cannot outlive an edit session. */
type AutomationsEditorState =
  | { status: 'idle' }
  | { status: 'editing'; draft: AiIndexAutomation[] };

type AutomationsEditorAction =
  | { type: 'editStarted'; automations: AiIndexAutomation[] }
  | { type: 'editStopped' }
  | { type: 'automationRemoved'; value: string };

const IDLE: AutomationsEditorState = { status: 'idle' };

const reducer = (
  state: AutomationsEditorState,
  action: AutomationsEditorAction
): AutomationsEditorState => {
  switch (action.type) {
    case 'editStarted':
      return { status: 'editing', draft: action.automations };
    case 'editStopped':
      return IDLE;
    case 'automationRemoved': {
      if (state.status !== 'editing') {
        return state;
      }
      return {
        status: 'editing',
        draft: state.draft.filter((automation) => automation.value !== action.value),
      };
    }
    default:
      return state;
  }
};

interface UseAutomationsEditorParams {
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export interface UseAutomationsEditorResult {
  isEditing: boolean;
  /** The draft while editing, the persisted automations otherwise. */
  automations: AiIndexAutomation[];
  workflowIds: string[];
  isSaving: boolean;
  isCreating: boolean;
  isBusy: boolean;
  startEditing: () => void;
  stopEditing: () => void;
  removeAutomation: (value: string) => void;
  save: () => Promise<void>;
  /** Resolves with the new workflow id once it is attached and persisted. */
  createAndAttach: () => Promise<string | undefined>;
}

export const useAutomationsEditor = ({
  aiIndex,
  onSaved,
}: UseAutomationsEditorParams): UseAutomationsEditorResult => {
  const [state, dispatch] = useReducer(reducer, IDLE);
  const { saveAutomations, isSaving } = useSaveAiIndexAutomations();
  const { createWorkflow, isCreating } = useCreateWorkflow();

  const savedAutomations = aiIndex?.automations;
  const automations = useMemo(
    () => (state.status === 'editing' ? state.draft : savedAutomations ?? []),
    [state, savedAutomations]
  );
  const workflowIds = useMemo(
    () =>
      automations
        .filter((automation) => automation.type === 'workflow')
        .map((automation) => automation.value),
    [automations]
  );

  const startEditing = useCallback(
    () => dispatch({ type: 'editStarted', automations: savedAutomations ?? [] }),
    [savedAutomations]
  );

  const stopEditing = useCallback(() => dispatch({ type: 'editStopped' }), []);

  const removeAutomation = useCallback(
    (value: string) => dispatch({ type: 'automationRemoved', value }),
    []
  );

  const persist = useCallback(
    async (next: AiIndexAutomation[]): Promise<boolean> => {
      if (!aiIndex) {
        return false;
      }
      const saved = await saveAutomations(aiIndex, next);
      if (saved) {
        dispatch({ type: 'editStopped' });
        onSaved();
      }
      return saved;
    },
    [aiIndex, onSaved, saveAutomations]
  );

  const save = useCallback(async () => {
    if (state.status !== 'editing') {
      return;
    }
    await persist(state.draft);
  }, [persist, state]);

  // Creating a workflow navigates away, so the draft is persisted before leaving.
  const createAndAttach = useCallback(async () => {
    if (!aiIndex || state.status !== 'editing') {
      return undefined;
    }
    const workflowId = await createWorkflow(buildStarterWorkflowYaml(aiIndex.id));
    if (!workflowId) {
      return undefined;
    }
    const saved = await persist([...state.draft, { type: 'workflow', value: workflowId }]);
    return saved ? workflowId : undefined;
  }, [aiIndex, createWorkflow, persist, state]);

  return {
    isEditing: state.status === 'editing',
    automations,
    workflowIds,
    isSaving,
    isCreating,
    isBusy: isSaving || isCreating,
    startEditing,
    stopEditing,
    removeAutomation,
    save,
    createAndAttach,
  };
};
