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
import type { Improvement } from '../../common/http_api/improvements';
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

const actionInputFor = (improvement: Improvement): Record<string, unknown> => {
  const { action, ai_index_id: aiIndexId, payload, target } = improvement;
  switch (action) {
    case 'add_ki':
      return {
        ai_index_id: aiIndexId,
        ki_id: addedKiIdFor(improvement.improvement_id),
        ki: payload.ki,
      };
    case 'edit_ki':
      return { ai_index_id: aiIndexId, ki_id: target?.ki_id, ki_patch: payload.ki_patch };
    default:
      return { ai_index_id: aiIndexId, ki_id: target?.ki_id };
  }
};

/** The proposal that puts an improvement up for review, or `undefined` when it has no action workflow. */
export const toProposal = (improvement: Improvement): ImprovementProposal | undefined => {
  const actionWorkflowId = ACTION_WORKFLOW_BY_IMPROVEMENT_ACTION[improvement.action];
  if (actionWorkflowId === undefined) {
    return undefined;
  }
  return {
    id: proposalIdFor(improvement.improvement_id),
    conversationId: proposalAnchorFor(improvement.ai_index_id),
    title: improvement.title,
    comment: improvement.rationale,
    actionWorkflowId,
    actionInput: actionInputFor(improvement),
  };
};
