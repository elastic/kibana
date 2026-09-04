/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CasesUI } from '../../containers/types';
import { useCaseWorkflowFilters, useCanRunCaseWorkflow } from './use_run_case_workflow';
import { useRunWorkflowOnCases } from './use_run_workflow_on_cases';

interface UseRunCasesWorkflowResult {
  /** Whether the current user is allowed to run a workflow from a case. */
  canRunWorkflow: boolean;
  /** Whether the workflow-selection modal is currently open. */
  isModalOpen: boolean;
  openModal: (cases: CasesUI) => void;
  closeModal: () => void;
  /** The set of cases the modal was opened for (empty when closed). */
  selectedCases: CasesUI;
  /** Executor that starts one workflow execution covering all selected cases. */
  runWorkflow: RunWorkflowExecutor;
  /** Predicate limiting the workflow selector to configured tags. */
  filterWorkflow: (workflow: WorkflowListItemDto) => boolean;
  /** Comparator prioritising tagged then context-relevant workflows. */
  sortWorkflow: (a: WorkflowListItemDto, b: WorkflowListItemDto) => number;
  /**
   * When true the panel should suppress its own success toast because the
   * executor will handle multi-case toasting itself.
   */
  showSuccessToast: boolean;
}

/**
 * Multi-case variant of `useRunCaseWorkflow`.
 * Keyed on a runtime-selected set of cases (`openModal` receives `CasesUI`),
 * starts a single workflow execution covering all selected cases through the
 * Cases-owned endpoint, and owns the success/failure toast itself.
 */
export const useRunCasesWorkflow = (): UseRunCasesWorkflowResult => {
  const canRunWorkflow = useCanRunCaseWorkflow();
  const { filterWorkflow, sortWorkflow } = useCaseWorkflowFilters();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCases, setSelectedCases] = useState<CasesUI>([]);

  const openModal = useCallback((cases: CasesUI) => {
    setSelectedCases(cases);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCases([]);
  }, []);

  const runWorkflow = useRunWorkflowOnCases({ cases: selectedCases });

  // The executor always handles the success toast itself so the "View execution"
  // button is placed consistently (actionProps.primary) for both N=1 and N>1.
  const showSuccessToast = false;

  return {
    canRunWorkflow,
    isModalOpen,
    openModal,
    closeModal,
    selectedCases,
    runWorkflow,
    filterWorkflow,
    sortWorkflow,
    showSuccessToast,
  };
};
