/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  ObservablesAddedTriggerId,
} from '../../../common/workflows/triggers';
import {
  createCaseWorkflowExecutionContext,
  type CaseWorkflowExecutionContext,
} from '../../../common/workflows/execution_context';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CaseUI } from '../../containers/types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

/**
 * All six `cases.*` trigger ids — workflows triggered by any of these are floated to the top of
 * the selector when the user opens "Run workflow" from a case detail page.
 */
const CASE_TRIGGER_TYPES = new Set([
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CaseStatusUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  ObservablesAddedTriggerId,
]);

/** Creates a predicate that keeps workflows matching any configured tag. */
export const createCaseWorkflowFilter = (workflowTags: readonly string[]) => {
  const configuredTags = new Set(workflowTags);

  return (workflow: WorkflowListItemDto): boolean =>
    configuredTags.size === 0 ||
    (workflow.definition?.tags ?? []).some((tag) => configuredTags.has(tag));
};

/** Creates a comparator that prioritizes configured tags, then context-relevant triggers. */
export const createCaseWorkflowComparator = (
  workflowTags: readonly string[],
  prioritizedTriggerTypes: ReadonlySet<string> = CASE_TRIGGER_TYPES
) => {
  const configuredTags = new Set(workflowTags);

  return (a: WorkflowListItemDto, b: WorkflowListItemDto): number => {
    const aHasConfiguredTag = (a.definition?.tags ?? []).some((tag) => configuredTags.has(tag));
    const bHasConfiguredTag = (b.definition?.tags ?? []).some((tag) => configuredTags.has(tag));
    const tagRank = Number(bHasConfiguredTag) - Number(aHasConfiguredTag);

    if (tagRank !== 0) {
      return tagRank;
    }

    // The @kbn/workflows trigger type union only knows about built-in types; cases.* trigger
    // types are runtime extensions not reflected in the TypeScript union.
    const aHasPrioritizedTrigger = (a.definition?.triggers ?? []).some((trigger) =>
      prioritizedTriggerTypes.has(trigger.type as string)
    );
    const bHasPrioritizedTrigger = (b.definition?.triggers ?? []).some((trigger) =>
      prioritizedTriggerTypes.has(trigger.type as string)
    );

    return Number(bHasPrioritizedTrigger) - Number(aHasPrioritizedTrigger);
  };
};

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
  /** Stable correlation context shared by every workflow run from this case. */
  executionContext: CaseWorkflowExecutionContext;
  /** Predicate that limits the selector to workflows matching the configured tags. */
  filterWorkflow: (workflow: WorkflowListItemDto) => boolean;
  /** Comparator that floats configured tags, then `cases.*` workflows, to the top. */
  sortWorkflow: (a: WorkflowListItemDto, b: WorkflowListItemDto) => number;
  workflowTags: string[];
}

export const useRunCaseWorkflow = ({
  caseData,
  workflowTags: workflowTagsOverride,
}: UseRunCaseWorkflowArgs): UseRunCaseWorkflowResult => {
  const { permissions } = useCasesContext();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const {
    data: { workflowTags: configuredWorkflowTags },
  } = useGetCaseConfiguration();
  const workflowTags = workflowTagsOverride ?? configuredWorkflowTags;

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
  const executionContext = useMemo(
    () => createCaseWorkflowExecutionContext(caseData.id),
    [caseData.id]
  );
  const filterWorkflow = useMemo(() => createCaseWorkflowFilter(workflowTags), [workflowTags]);
  const sortWorkflow = useMemo(() => createCaseWorkflowComparator(workflowTags), [workflowTags]);

  return {
    canRunWorkflow,
    isModalOpen,
    openModal,
    closeModal,
    inputs,
    executionContext,
    filterWorkflow,
    sortWorkflow,
    workflowTags,
  };
};
