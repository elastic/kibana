/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
} from '../../../common/workflows/triggers';
import { CASE_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CaseUI } from '../../containers/types';
import { useCasesConfig } from '../../common/lib/kibana';
import { useCasesWorkflowExecutor } from './use_cases_workflow_executor';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

/**
 * All `cases.*` trigger IDs — workflows triggered by any of these are prioritised
 * in the selector when the user opens "Run workflow" from a case detail page.
 */
const CASE_TRIGGER_TYPES = new Set<string>([
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
]);

/**
 * Stable empty array used as the default for workflowTags to avoid
 * re-creating the array on every render (which would defeat downstream memos).
 */
const NO_WORKFLOW_TAGS: readonly string[] = [];

/** Reads tags from both the top-level ES-indexed field and the YAML-source field. */
const getWorkflowTags = (workflow: WorkflowListItemDto): string[] =>
  (workflow.tags as string[] | undefined) ?? workflow.definition?.tags ?? [];

/**
 * Returns a predicate that keeps workflows matching any configured tag.
 * An empty `workflowTags` array means no filtering — all enabled workflows pass.
 */
export const createCaseWorkflowFilter = (
  workflowTags: readonly string[]
): ((workflow: WorkflowListItemDto) => boolean) => {
  const configuredTags = new Set(workflowTags);
  return (workflow) =>
    configuredTags.size === 0 || getWorkflowTags(workflow).some((tag) => configuredTags.has(tag));
};

/**
 * Returns a comparator that ranks workflows with configured tags first, then
 * workflows that declare a `cases.*` trigger (context-relevant), then all others.
 */
export const createCaseWorkflowComparator = (
  workflowTags: readonly string[]
): ((a: WorkflowListItemDto, b: WorkflowListItemDto) => number) => {
  const configuredTags = new Set(workflowTags);

  return (a, b) => {
    const aHasTag = getWorkflowTags(a).some((tag) => configuredTags.has(tag));
    const bHasTag = getWorkflowTags(b).some((tag) => configuredTags.has(tag));
    const tagRank = Number(bHasTag) - Number(aHasTag);
    if (tagRank !== 0) return tagRank;

    // The @kbn/workflows trigger-type union only knows built-in types; cases.* trigger
    // IDs are runtime extensions, so we compare as strings.
    const aHasCaseTrigger = (a.definition?.triggers ?? []).some((t) =>
      CASE_TRIGGER_TYPES.has(t.type as string)
    );
    const bHasCaseTrigger = (b.definition?.triggers ?? []).some((t) =>
      CASE_TRIGGER_TYPES.has(t.type as string)
    );
    return Number(bHasCaseTrigger) - Number(aHasCaseTrigger);
  };
};

/**
 * Returns true when workflows are enabled and readable from Cases — used to decide
 * whether to show the "Available workflow tags" settings section.
 *
 * Requires:
 *   1. `runWorkflows.enabled` kibana config flag
 *   2. Workflows UI feature flag (uiSetting)
 *   3. `workflowsManagement:read` application capability
 */
export const useAreWorkflowsAvailableForCases = (): boolean => {
  const { runWorkflowsEnabled } = useCasesConfig();
  const { canReadWorkflow } = useWorkflowsCapabilities();
  const workflowsUIEnabled = useWorkflowsUIEnabledSetting();

  return useMemo(
    () => runWorkflowsEnabled && workflowsUIEnabled && canReadWorkflow,
    [runWorkflowsEnabled, workflowsUIEnabled, canReadWorkflow]
  );
};

/**
 * Returns true when the current user satisfies all four conditions required to
 * run a workflow from a case:
 *   1. `cases:<owner>/updateCase` privilege (permissions.update)
 *   2. `runWorkflows.enabled` kibana config flag
 *   3. Workflows UI feature flag (uiSetting)
 *   4. `workflowsManagement:execute` application capability
 */
export const useCanRunCaseWorkflow = (): boolean => {
  const { permissions } = useCasesContext();
  const { runWorkflowsEnabled } = useCasesConfig();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowsUIEnabled = useWorkflowsUIEnabledSetting();

  return useMemo(
    () => permissions.update && runWorkflowsEnabled && workflowsUIEnabled && canExecuteWorkflow,
    [permissions.update, runWorkflowsEnabled, workflowsUIEnabled, canExecuteWorkflow]
  );
};

/**
 * Reads the configured workflow tags from the current owner's case configuration and
 * returns memoised `filterWorkflow` / `sortWorkflow` functions for the pickers.
 * Falls back to `NO_WORKFLOW_TAGS` (show all) while the configuration is loading.
 */
export const useCaseWorkflowFilters = (): {
  filterWorkflow: (workflow: WorkflowListItemDto) => boolean;
  sortWorkflow: (a: WorkflowListItemDto, b: WorkflowListItemDto) => number;
} => {
  const { data: configuration } = useGetCaseConfiguration();
  const workflowTags = configuration?.workflowTags ?? NO_WORKFLOW_TAGS;

  const filterWorkflow = useMemo(() => createCaseWorkflowFilter(workflowTags), [workflowTags]);
  const sortWorkflow = useMemo(() => createCaseWorkflowComparator(workflowTags), [workflowTags]);

  return { filterWorkflow, sortWorkflow };
};

interface UseRunCaseWorkflowArgs {
  caseData: CaseUI;
}

export interface UseRunCaseWorkflowResult {
  /** Whether the current user is allowed to run a workflow from this case. */
  canRunWorkflow: boolean;
  /** Whether the workflow-selection modal is currently open. */
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  /** Stable inputs forwarded to every workflow execution. */
  inputs: Record<string, unknown>;
  /** Cases-owned executor that routes runs through the Cases API. */
  runWorkflow: RunWorkflowExecutor;
  /** Predicate limiting the workflow selector to configured tags. */
  filterWorkflow: (workflow: WorkflowListItemDto) => boolean;
  /** Comparator prioritising tagged then context-relevant workflows. */
  sortWorkflow: (a: WorkflowListItemDto, b: WorkflowListItemDto) => number;
}

export const useRunCaseWorkflow = ({
  caseData,
}: UseRunCaseWorkflowArgs): UseRunCaseWorkflowResult => {
  const canRunWorkflow = useCanRunCaseWorkflow();
  const { filterWorkflow, sortWorkflow } = useCaseWorkflowFilters();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const inputs = useMemo(
    () => ({
      event: {
        caseIds: [caseData.id],
      },
    }),
    [caseData.id]
  );

  const origin = useMemo(
    () => ({ type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: caseData.id }),
    [caseData.id]
  );

  const runWorkflow = useCasesWorkflowExecutor({ caseId: caseData.id, origin });

  return {
    canRunWorkflow,
    isModalOpen,
    openModal,
    closeModal,
    inputs,
    runWorkflow,
    filterWorkflow,
    sortWorkflow,
  };
};
