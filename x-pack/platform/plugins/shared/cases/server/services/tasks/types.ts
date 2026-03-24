/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseTaskStatus,
  CaseTaskPriority,
  CaseTaskAssignee,
  CaseTaskCustomField,
} from '../../../common/types/domain/task/v1';
import type { User } from '../../common/types/user';
import type { IndexRefresh } from '../types';

// ---- Create ----------------------------------------------------------------

export interface CreateTaskArgs extends IndexRefresh {
  caseId: string;
  title: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
  parent_task_id?: string | null;
  custom_fields?: CaseTaskCustomField[];
  template_id?: string | null;
  owner: string;
  user: User;
}

export interface BulkCreateTasksArgs extends IndexRefresh {
  tasks: Array<Omit<CreateTaskArgs, keyof IndexRefresh>>;
}

// ---- Update ----------------------------------------------------------------

export interface UpdateTaskArgs extends IndexRefresh {
  taskId: string;
  title?: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
  parent_task_id?: string | null;
  sort_order?: number;
  custom_fields?: CaseTaskCustomField[];
  user: User;
  version: string;
}

export interface BulkUpdateTaskArgs extends IndexRefresh {
  taskId: string;
  attributes: Partial<UpdateTaskArgs>;
  version: string;
}

export interface BulkUpdateTasksArgs extends IndexRefresh {
  updates: BulkUpdateTaskArgs[];
}

// ---- Find / Filter ---------------------------------------------------------

export interface TaskFilterArgs {
  status?: CaseTaskStatus | CaseTaskStatus[];
  priority?: CaseTaskPriority | CaseTaskPriority[];
  assignees?: string[]; // user profile UIDs
  due_date_from?: string;
  due_date_to?: string;
  parent_task_id?: string | null; // null = root tasks only; undefined = all depths
  sort_field?: 'created_at' | 'due_date' | 'priority' | 'sort_order' | 'status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  search?: string;
}

export interface FindTasksArgs extends TaskFilterArgs {
  caseIds?: string[];
  owners?: string[];
}

export interface MyTasksArgs extends TaskFilterArgs {
  userProfileUid: string;
  caseIds?: string[];
  includeCompleted?: boolean;
}

// ---- Reorder ---------------------------------------------------------------

export interface ReorderTasksArgs extends IndexRefresh {
  caseId: string;
  parentTaskId: string | null;
  orderedTaskIds: string[];
}
