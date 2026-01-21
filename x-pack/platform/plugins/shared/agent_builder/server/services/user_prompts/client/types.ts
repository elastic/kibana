/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { UserPromptProperties } from './storage';

export type UserPromptDocument = Pick<GetResponse<UserPromptProperties>, '_source' | '_id'>;

export interface UserPrompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface UserPromptWithSpace extends UserPrompt {
  space: string;
}

export interface UserPromptCreateParams {
  id: string;
  name: string;
  content: string;
}

export interface UserPromptUpdateParams {
  name?: string;
  content?: string;
}

export interface FindUserPromptsParams {
  query?: string;
  page?: number;
  perPage?: number;
}

export interface FindUserPromptsResult {
  page: number;
  perPage: number;
  total: number;
  data: UserPromptWithSpace[];
}
