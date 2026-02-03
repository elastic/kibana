/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { UserPromptProperties } from './storage';
import type { UserPrompt } from '../../../../common/http_api/user_prompts';

export type UserPromptDocument = Pick<GetResponse<UserPromptProperties>, '_source' | '_id'>;

export interface FindUserPromptsParams {
  query?: string;
  page?: number;
  perPage?: number;
}

export interface FindUserPromptsResult {
  page: number;
  perPage: number;
  total: number;
  data: UserPrompt[];
}
