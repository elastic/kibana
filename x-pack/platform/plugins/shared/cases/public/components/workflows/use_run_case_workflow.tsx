/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  ObservablesAddedTriggerId,
} from '../../../common/workflows/triggers';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CaseUI } from '../../containers/types';

/**
 * All six `cases.*` trigger ids — workflows triggered by any of these are floated to the top of
 * the selector when the user opens "Run workflow" from a case detail page.
 */
const CASE_TRIGGER_TYPES = [
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  ObservablesAddedTriggerId,
] as const;

interface UseRunCaseWorkflowArgs {
  caseData: CaseUI;
  /** Tags from the case configuration (empty = show all). */
  workflowTags?: string[];
}

interface UseRunCaseWorkflowResult {
  /** Whether the current user is allowed to run a workflow from a case. */
  canRunWorkflow: boolean;
  /** Whether the workflow-selection modal is currently open. */
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  /** Stable inputs object to pass to RunWorkflowPanel / RunCaseWorkflowModal. */
  inputs: Record<string, unknown>;
  sortTriggerTypes: readonly string[];
  workflowTags: string[] | undefined;
}

export const useRunCaseWorkflow = ({
  caseData,
  workflowTags,
}: UseRunCaseWorkflowArgs): UseRunCaseWorkflowResult => {
  const { permissions } = useCasesContext();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();

  const canRunWorkflow = useMemo(
    () => permissions.update && workflowUIEnabled && canExecuteWorkflow,
    [permissions.update, workflowUIEnabled, canExecuteWorkflow]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const inputs = useMemo(
    () => ({
      event: {
        caseId: caseData.id,
        owner: caseData.owner,
      },
    }),
    [caseData.id, caseData.owner]
  );

  return {
    canRunWorkflow,
    isModalOpen,
    openModal,
    closeModal,
    inputs,
    sortTriggerTypes: CASE_TRIGGER_TYPES,
    workflowTags,
  };
};
