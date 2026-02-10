/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PublicSkillDefinition,
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';

export interface ListSkillsResponse {
  results: PublicSkillDefinition[];
}

export type GetSkillResponse = PublicSkillDefinition;

export interface DeleteSkillResponse {
  success: boolean;
}

export type CreateSkillPayload = PersistedSkillCreateRequest;

export type UpdateSkillPayload = PersistedSkillUpdateRequest;

export type CreateSkillResponse = PublicSkillDefinition;

export type UpdateSkillResponse = PublicSkillDefinition;
