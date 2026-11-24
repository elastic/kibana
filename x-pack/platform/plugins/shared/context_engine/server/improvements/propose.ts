/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import type { ProposedImprovement } from '../../common/http_api/improvements_output_schema';
import type { ImprovementProposal } from '../proposals/provider';

/** The action workflow that carries out each improvement action once a person approves it. */
const ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION: Partial<Record<ImprovementAction, string>> = {
  add_ki: CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID,
  edit_ki: CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID,
  remove_ki: CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID,
};

/** Whether an approved improvement of this action can be carried out as a proposal. */
export const isProposable = (action: ImprovementAction): boolean =>
  ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION[action] !== undefined;

/**
 * Proposals are listed per conversation, and they carry no other subject, so one anchor per AI
 * index lets a panel list the proposals about it.
 */
export const proposalAnchorFor = (aiIndexId: string): string => `context-engine:${aiIndexId}`;

/**
 * The `improvement_id` already hashes the space in with the AI index, and a proposal's id is
 * unique across spaces rather than within one, so deriving from it keeps two spaces apart.
 */
export const proposalIdFor = (improvementId: string): string => `context-engine-${improvementId}`;

/** The id a KI added by an improvement is created under, so the approval's target is known up front. */
export const addedKiIdFor = (improvementId: string): string => `improvement-${improvementId}`;

/** The improvement action a proposal's action workflow carries out. */
export const improvementActionOf = (actionWorkflowId: string): ImprovementAction | undefined =>
  (Object.keys(ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION) as ImprovementAction[]).find(
    (action) => ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION[action] === actionWorkflowId
  );

/** Where a proposed change came from, so a reviewer or a later run can trace it to its evidence. */
export interface ProposalProvenance {
  agent_run_id: string;
  signal_ids: string[];
  signal_spaces: string[];
  signal_window: { from: string; to: string };
  signal_count: number;
  tags?: string[];
}

export interface ProposedChange {
  improvementId: string;
  aiIndexId: string;
  proposal: ProposedImprovement;
  provenance: ProposalProvenance;
}

const actionInputFor = ({
  improvementId,
  aiIndexId,
  proposal: { action, payload, target },
  provenance,
}: ProposedChange): Record<string, unknown> => {
  switch (action) {
    case 'add_ki':
      return {
        ai_index_id: aiIndexId,
        ki_id: addedKiIdFor(improvementId),
        ki: payload?.ki,
        provenance,
      };
    case 'edit_ki':
      return {
        ai_index_id: aiIndexId,
        ki_id: target?.ki_id,
        ki_patch: payload?.ki_patch,
        provenance,
      };
    default:
      return { ai_index_id: aiIndexId, ki_id: target?.ki_id, provenance };
  }
};

/** The proposal that puts a change up for review, or `undefined` when it has no action workflow. */
export const toProposal = (change: ProposedChange): ImprovementProposal | undefined => {
  const { improvementId, aiIndexId, proposal } = change;
  const actionWorkflowId = ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION[proposal.action];
  if (actionWorkflowId === undefined) {
    return undefined;
  }
  return {
    id: proposalIdFor(improvementId),
    conversationId: proposalAnchorFor(aiIndexId),
    title: proposal.title,
    comment: proposal.rationale,
    actionWorkflowId,
    actionInput: actionInputFor(change),
  };
};
