/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVESTIGATION_LIMITS,
  MAX_TASKS_PER_CASE,
} from '../../../../common/investigations/constants';
import { PROPOSAL_CATEGORIES } from '../../../../common/investigations/types';
import type {
  DueWithin,
  ProcedurePhase,
  ProcedureTemplateSubtask,
  ProcedureTemplateTask,
  ProposalCategory,
  TaskAutoRule,
  TaskOwnerType,
  TaskPriority,
} from '../../../../common/investigations/types';
import * as i18n from '../procedure/translations';

/** A task list holds at most this many tasks, sub-tasks included (the Cases task limit). */
export const MAX_TEMPLATE_TASKS = MAX_TASKS_PER_CASE;
export const MAX_SUBTASKS_PER_TASK = 20;
export const MAX_DUE_WITHIN = 100000;

export type AutoKind = 'manual' | 'claim' | 'action';
export type DueUnit = DueWithin['unit'];
export const DUE_UNITS: readonly DueUnit[] = ['minutes', 'hours', 'days'];

export interface DraftSubtask {
  key: string;
  title: string;
  description: string;
  priority: TaskPriority;
  required: boolean;
  /** The number of "Due within"; empty means no deadline. */
  dueValue: string;
  dueUnit: DueUnit;
}

/** One editable row of a task list. `key` is local and stable across edits. */
export interface DraftTask {
  key: string;
  title: string;
  phase: ProcedurePhase;
  description: string;
  required: boolean;
  priority: TaskPriority;
  dueValue: string;
  dueUnit: DueUnit;
  ownerType: TaskOwnerType;
  owner: string;
  workflowId: string;
  autoKind: AutoKind;
  claimQuestion: string;
  actionCategory: ProposalCategory;
  /** Key of the task this one starts after, or an empty string. */
  afterKey: string;
  subtasks: DraftSubtask[];
}

export interface DraftFieldErrors {
  title?: string;
  description?: string;
  claimQuestion?: string;
  dueWithin?: string;
}

export interface DraftErrors {
  task: DraftFieldErrors;
  subtasks: Record<string, DraftFieldErrors>;
}

export const createDraftKey = (counter: number): string => `draft-${counter}`;

export const countDraftTasks = (drafts: readonly DraftTask[]): number =>
  drafts.reduce((total, draft) => total + 1 + draft.subtasks.length, 0);

export const createBlankDraft = (key: string, title: string): DraftTask => ({
  key,
  title,
  phase: 'Investigate',
  description: '',
  required: false,
  priority: 'medium',
  dueValue: '',
  dueUnit: 'hours',
  ownerType: 'person',
  owner: '',
  workflowId: '',
  autoKind: 'manual',
  claimQuestion: '',
  actionCategory: PROPOSAL_CATEGORIES[0],
  afterKey: '',
  subtasks: [],
});

export const createBlankSubtask = (key: string, title: string): DraftSubtask => ({
  key,
  title,
  description: '',
  priority: 'medium',
  required: false,
  dueValue: '',
  dueUnit: 'hours',
});

const toDue = (dueWithin: DueWithin | null | undefined): { value: string; unit: DueUnit } =>
  dueWithin && dueWithin.value > 0
    ? { value: String(dueWithin.value), unit: dueWithin.unit }
    : { value: '', unit: 'hours' };

export const toDraft = (
  tasks: readonly ProcedureTemplateTask[],
  nextKey: () => string
): DraftTask[] => {
  const drafts = tasks.map<DraftTask>((task) => {
    const { auto } = task;
    const due = toDue(task.due_within);
    return {
      key: nextKey(),
      title: task.title,
      phase: task.phase,
      description: task.description ?? '',
      required: task.required,
      priority: task.priority ?? 'medium',
      dueValue: due.value,
      dueUnit: due.unit,
      ownerType: task.owner_type,
      owner: task.owner ?? '',
      workflowId: task.workflow_id ?? '',
      autoKind: auto?.type ?? 'manual',
      claimQuestion: auto?.type === 'claim' ? auto.question ?? '' : '',
      actionCategory: auto?.type === 'action' ? auto.category : PROPOSAL_CATEGORIES[0],
      afterKey: '',
      subtasks: (task.subtasks ?? []).map<DraftSubtask>((subtask) => {
        const subtaskDue = toDue(subtask.due_within);
        return {
          key: nextKey(),
          title: subtask.title,
          description: subtask.description ?? '',
          priority: subtask.priority ?? 'medium',
          required: subtask.required,
          dueValue: subtaskDue.value,
          dueUnit: subtaskDue.unit,
        };
      }),
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

/** The parsed "Due within", or null for a blank or non-positive value (no deadline). */
const toDueWithin = (value: string, unit: DueUnit): DueWithin | null => {
  const parsed = Number(value.trim());
  return value.trim().length > 0 && Number.isFinite(parsed) && parsed >= 1
    ? { value: parsed, unit }
    : null;
};

const toTemplateSubtask = (subtask: DraftSubtask): ProcedureTemplateSubtask => {
  const description = subtask.description.trim();
  return {
    title: subtask.title.trim(),
    description: description.length > 0 ? description : null,
    priority: subtask.priority,
    required: subtask.required,
    due_within: toDueWithin(subtask.dueValue, subtask.dueUnit),
  };
};

export const toTemplateTasks = (drafts: readonly DraftTask[]): ProcedureTemplateTask[] =>
  drafts.map((draft) => {
    const after = drafts.find((candidate) => candidate.key === draft.afterKey);
    const description = draft.description.trim();
    const owner = draft.owner.trim();
    const workflowId = draft.workflowId.trim();
    return {
      title: draft.title.trim(),
      phase: draft.phase,
      description: description.length > 0 ? description : null,
      required: draft.required,
      owner_type: draft.ownerType,
      owner: owner.length > 0 && draft.ownerType === 'team' ? owner : null,
      auto: toAutoRule(draft),
      after: after ? after.title.trim() : null,
      priority: draft.priority,
      due_within: toDueWithin(draft.dueValue, draft.dueUnit),
      workflow_id: draft.ownerType === 'automation' && workflowId.length > 0 ? workflowId : null,
      subtasks: draft.subtasks.map(toTemplateSubtask),
    };
  });

const validateDue = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_DUE_WITHIN
    ? undefined
    : i18n.EDITOR_DUE_WITHIN_INVALID;
};

export const validateDraft = (drafts: readonly DraftTask[]): Record<string, DraftErrors> => {
  const errors: Record<string, DraftErrors> = {};
  const seen = new Set<string>();
  drafts.forEach((draft) => {
    const task: DraftFieldErrors = {};
    const subtasks: Record<string, DraftFieldErrors> = {};
    const title = draft.title.trim();
    if (title.length === 0) {
      task.title = i18n.EDITOR_TITLE_REQUIRED;
    } else if (title.length > INVESTIGATION_LIMITS.maxTitleLength) {
      task.title = i18n.EDITOR_TITLE_TOO_LONG;
    } else if (seen.has(title.toLowerCase())) {
      task.title = i18n.EDITOR_TITLE_DUPLICATE;
    } else {
      seen.add(title.toLowerCase());
    }
    if (draft.description.trim().length > INVESTIGATION_LIMITS.maxShortTextLength) {
      task.description = i18n.EDITOR_TEXT_TOO_LONG;
    }
    if (draft.autoKind === 'claim') {
      const question = draft.claimQuestion.trim();
      if (question.length === 0) {
        task.claimQuestion = i18n.EDITOR_CLAIM_REQUIRED;
      } else if (question.length > INVESTIGATION_LIMITS.maxShortTextLength) {
        task.claimQuestion = i18n.EDITOR_TEXT_TOO_LONG;
      }
    }
    const dueError = validateDue(draft.dueValue);
    if (dueError) {
      task.dueWithin = dueError;
    }
    draft.subtasks.forEach((subtask) => {
      const row: DraftFieldErrors = {};
      const subtaskTitle = subtask.title.trim();
      if (subtaskTitle.length === 0) {
        row.title = i18n.EDITOR_TITLE_REQUIRED;
      } else if (subtaskTitle.length > INVESTIGATION_LIMITS.maxTitleLength) {
        row.title = i18n.EDITOR_TITLE_TOO_LONG;
      }
      if (subtask.description.trim().length > INVESTIGATION_LIMITS.maxShortTextLength) {
        row.description = i18n.EDITOR_TEXT_TOO_LONG;
      }
      const subtaskDueError = validateDue(subtask.dueValue);
      if (subtaskDueError) {
        row.dueWithin = subtaskDueError;
      }
      if (Object.keys(row).length > 0) {
        subtasks[subtask.key] = row;
      }
    });
    if (Object.keys(task).length > 0 || Object.keys(subtasks).length > 0) {
      errors[draft.key] = { task, subtasks };
    }
  });
  return errors;
};

/** A stable string of what would be saved, to tell whether the draft changed. */
export const serializeDraft = (drafts: readonly DraftTask[]): string =>
  JSON.stringify(toTemplateTasks(drafts));
