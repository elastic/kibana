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
} from '../../../common/types/domain/task/v1';
import type { User } from '../../common/types/user';
import type { IndexRefresh } from '../types';

export interface TaskInput {
  title: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
  required?: boolean;
  parent_task_id?: string | null;
  template_id?: string | null;
}

export interface CreateTaskArgs extends TaskInput, IndexRefresh {
  caseId: string;
  owner: string;
  user: User;
}

export interface BulkCreateTasksArgs extends IndexRefresh {
  caseId: string;
  owner: string;
  user: User;
  tasks: TaskInput[];
}

export interface UpdateTaskArgs extends IndexRefresh {
  taskId: string;
  version: string;
  user: User;
  title?: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
  required?: boolean;
}

export interface FindTasksArgs {
  caseIds?: string[];
  owners?: string[];
  status?: CaseTaskStatus[];
  /** User profile uids. */
  assignees?: string[];
  parentTaskId?: string;
  search?: string;
  sortField?: 'sort_order' | 'created_at' | 'due_date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface ReorderTasksArgs extends IndexRefresh {
  orderedTaskIds: string[];
}
