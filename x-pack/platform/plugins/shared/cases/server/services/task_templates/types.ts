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
  tags?: string[];
  tasks: CaseTaskTemplateTask[];
  owner: string;
  user: User;
}

export interface UpdateTemplateArgs extends IndexRefresh {
  templateId: string;
  version: string;
  user: User;
  name?: string;
  description?: string;
  tags?: string[];
  tasks?: CaseTaskTemplateTask[];
}

export interface FindTemplatesArgs {
  owners?: string[];
  tags?: string[];
  search?: string;
  page?: number;
  perPage?: number;
}
