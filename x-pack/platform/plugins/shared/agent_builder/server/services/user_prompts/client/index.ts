/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createClient, type UserPromptClient } from './client';
export type { FindUserPromptsParams, FindUserPromptsResult } from './types';

export type {
  CreateUserPromptPayload as UserPromptCreateParams,
  UpdateUserPromptPayload as UserPromptUpdateParams,
  UserPrompt,
} from '../../../../common/http_api/user_prompts';
