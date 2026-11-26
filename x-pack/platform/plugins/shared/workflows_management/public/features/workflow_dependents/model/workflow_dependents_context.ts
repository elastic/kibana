/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { UseWorkflowDependentsResult } from './use_workflow_dependents';

export type WorkflowLinksTab = 'usedBy' | 'runs';

/** Resolves false when the user cancels saving `draftYaml` because it breaks workflows calling this one. */
export type ConfirmBreakingChange = (draftYaml: string | undefined) => Promise<boolean>;

export interface WorkflowDependentsContextValue {
  dependents: UseWorkflowDependentsResult;
  openLinks: (tab: WorkflowLinksTab) => void;
  confirmBreakingChange: ConfirmBreakingChange;
}

export const WorkflowDependentsContext = createContext<WorkflowDependentsContextValue | null>(null);

/** The connected-workflows analysis, or undefined outside a `WorkflowDependentsProvider`. */
export const useWorkflowDependentsContext = (): WorkflowDependentsContextValue | undefined =>
  useContext(WorkflowDependentsContext) ?? undefined;

/** The save check, or undefined outside a `WorkflowDependentsProvider`, where nothing is checked. */
export const useConfirmBreakingChange = (): ConfirmBreakingChange | undefined =>
  useContext(WorkflowDependentsContext)?.confirmBreakingChange;
