/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AiIndexAutomation, GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { buildStarterWorkflowYaml } from '../utils/starter_workflow_yaml';
import { useCreateWorkflow } from './use_create_workflow';
import { useSaveAiIndexAutomations } from './use_save_ai_index_automations';

interface UseAutomationsEditorParams {
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void | Promise<void>;
}

export interface UseAutomationsEditorResult {
  automations: AiIndexAutomation[];
  workflowIds: string[];
  isSaving: boolean;
  isCreating: boolean;
  isBusy: boolean;
  deleteAutomation: (value: string) => Promise<boolean>;
  /** Resolves with the new workflow id once it is attached and persisted. */
  createAndAttach: () => Promise<string | undefined>;
}

export const useAutomationsEditor = ({
  aiIndex,
  onSaved,
}: UseAutomationsEditorParams): UseAutomationsEditorResult => {
  const { saveAutomations, isSaving } = useSaveAiIndexAutomations();
  const { createWorkflow, isCreating } = useCreateWorkflow();
  const [isPersisting, setIsPersisting] = useState(false);

  const automations = useMemo(() => aiIndex?.automations ?? [], [aiIndex?.automations]);
  const workflowIds = useMemo(
    () =>
      automations
        .filter((automation) => automation.type === 'workflow')
        .map((automation) => automation.value),
    [automations]
  );

  const persist = useCallback(
    async (next: AiIndexAutomation[]): Promise<boolean> => {
      if (!aiIndex) {
        return false;
      }
      setIsPersisting(true);
      try {
        const saved = await saveAutomations(aiIndex, next);
        if (saved) {
          // Wait for the AI index refetch so navigation to Workflows does not abort it.
          await onSaved();
        }
        return saved;
      } finally {
        setIsPersisting(false);
      }
    },
    [aiIndex, onSaved, saveAutomations]
  );

  const deleteAutomation = useCallback(
    async (value: string) => {
      return persist(automations.filter((automation) => automation.value !== value));
    },
    [automations, persist]
  );

  // Creating a workflow navigates away, so automations are persisted before leaving.
  const createAndAttach = useCallback(async () => {
    if (!aiIndex) {
      return undefined;
    }
    const workflowId = await createWorkflow(buildStarterWorkflowYaml(aiIndex.id));
    if (!workflowId) {
      return undefined;
    }
    const saved = await persist([...automations, { type: 'workflow', value: workflowId }]);
    return saved ? workflowId : undefined;
  }, [aiIndex, automations, createWorkflow, persist]);

  return {
    automations,
    workflowIds,
    isSaving,
    isCreating,
    isBusy: isSaving || isCreating || isPersisting,
    deleteAutomation,
    createAndAttach,
  };
};
