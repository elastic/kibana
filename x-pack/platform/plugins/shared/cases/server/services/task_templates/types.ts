/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseTaskTemplateTask } from '../../../common/types/domain/task_template/v1';
import type { User } from '../../common/types/user';
import type { IndexRefresh } from '../types';

export interface CreateTemplateArgs extends IndexRefresh {
  name: string;
  description?: string;
  scope?: 'global' | 'space';
  tags?: string[];
  tasks: CaseTaskTemplateTask[];
  owner: string;
  user: User;
}

export interface UpdateTemplateArgs extends IndexRefresh {
  templateId: string;
  version: string;
  name?: string;
  description?: string;
  scope?: 'global' | 'space';
  tags?: string[];
  tasks?: CaseTaskTemplateTask[];
  user: User;
}

export interface FindTemplatesArgs {
  scope?: 'global' | 'space';
  tags?: string[];
  owners?: string[];
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ApplyTemplateArgs extends IndexRefresh {
  templateId: string;
  caseId: string;
  owner: string;
  user: User;
  due_date_anchor?: string; // ISO 8601 — defaults to now
}
