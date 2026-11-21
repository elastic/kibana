/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { PROPOSAL_CATEGORIES } from '../../../../common/investigations/types';
import type {
  ProcedurePhase,
  ProcedureTemplateTask,
  ProposalCategory,
  TaskAutoRule,
  TaskOwnerType,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export const MAX_TEMPLATE_TASKS = 200;

export type AutoKind = 'manual' | 'claim' | 'action';

/** One editable row of a procedure template. `key` is local and stable across edits. */
export interface DraftTask {
  key: string;
  title: string;
  phase: ProcedurePhase;
  description: string;
  required: boolean;
  ownerType: TaskOwnerType;
  owner: string;
  autoKind: AutoKind;
  claimQuestion: string;
  actionCategory: ProposalCategory;
  /** Key of the task this one starts after, or an empty string. */
  afterKey: string;
}

export interface DraftTaskErrors {
  title?: string;
  description?: string;
  claimQuestion?: string;
}

export const createDraftKey = (counter: number): string => `draft-${counter}`;

export const createBlankDraft = (key: string, title: string): DraftTask => ({
  key,
  title,
  phase: 'Investigate',
  description: '',
  required: false,
  ownerType: 'person',
  owner: '',
  autoKind: 'manual',
  claimQuestion: '',
  actionCategory: PROPOSAL_CATEGORIES[0],
  afterKey: '',
});

export const toDraft = (
  tasks: readonly ProcedureTemplateTask[],
  nextKey: () => string
): DraftTask[] => {
  const drafts = tasks.map<DraftTask>((task) => {
    const { auto } = task;
    return {
      key: nextKey(),
      title: task.title,
      phase: task.phase,
      description: task.description ?? '',
      required: task.required,
      ownerType: task.owner_type,
      owner: task.owner ?? '',
      autoKind: auto?.type ?? 'manual',
      claimQuestion: auto?.type === 'claim' ? auto.question ?? '' : '',
      actionCategory: auto?.type === 'action' ? auto.category : PROPOSAL_CATEGORIES[0],
      afterKey: '',
    };
  });
  tasks.forEach((task, index) => {
    if (!task.after) {
      return;
    }
    const target = drafts.find(
      (candidate, candidateIndex) =>
        candidateIndex !== index && candidate.title.toLowerCase() === task.after?.toLowerCase()
    );
    drafts[index] = { ...drafts[index], afterKey: target?.key ?? '' };
  });
  return drafts;
};

const toAutoRule = (draft: DraftTask): TaskAutoRule | null => {
  if (draft.autoKind === 'claim') {
    return { type: 'claim', question: draft.claimQuestion.trim() };
  }
  if (draft.autoKind === 'action') {
    return { type: 'action', category: draft.actionCategory };
  }
  return null;
};

export const toTemplateTasks = (drafts: readonly DraftTask[]): ProcedureTemplateTask[] =>
  drafts.map((draft) => {
    const after = drafts.find((candidate) => candidate.key === draft.afterKey);
    const description = draft.description.trim();
    const owner = draft.owner.trim();
    return {
      title: draft.title.trim(),
      phase: draft.phase,
      description: description.length > 0 ? description : null,
      required: draft.required,
      owner_type: draft.ownerType,
      owner:
        owner.length > 0 && (draft.ownerType === 'team' || draft.ownerType === 'person')
          ? owner
          : null,
      auto: toAutoRule(draft),
      after: after ? after.title.trim() : null,
    };
  });

export const validateDraft = (drafts: readonly DraftTask[]): Record<string, DraftTaskErrors> => {
  const errors: Record<string, DraftTaskErrors> = {};
  const seen = new Map<string, string>();
  drafts.forEach((draft) => {
    const row: DraftTaskErrors = {};
    const title = draft.title.trim();
    if (title.length === 0) {
      row.title = i18n.EDITOR_TITLE_REQUIRED;
    } else if (title.length > INVESTIGATION_LIMITS.maxTitleLength) {
      row.title = i18n.EDITOR_TITLE_TOO_LONG;
    } else if (seen.has(title.toLowerCase())) {
      row.title = i18n.EDITOR_TITLE_DUPLICATE;
    } else {
      seen.set(title.toLowerCase(), draft.key);
    }
    if (draft.description.trim().length > INVESTIGATION_LIMITS.maxShortTextLength) {
      row.description = i18n.EDITOR_TEXT_TOO_LONG;
    }
    if (draft.autoKind === 'claim') {
      const question = draft.claimQuestion.trim();
      if (question.length === 0) {
        row.claimQuestion = i18n.EDITOR_CLAIM_REQUIRED;
      } else if (question.length > INVESTIGATION_LIMITS.maxShortTextLength) {
        row.claimQuestion = i18n.EDITOR_TEXT_TOO_LONG;
      }
    }
    if (Object.keys(row).length > 0) {
      errors[draft.key] = row;
    }
  });
  return errors;
};

/** A stable string of what would be saved, to tell whether the draft changed. */
export const serializeDraft = (drafts: readonly DraftTask[]): string =>
  JSON.stringify(toTemplateTasks(drafts));
