/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentProfile } from '@kbn/onechat-common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentProfileListOptions {}

export type AgentProfileCreateRequest = Omit<AgentProfile, 'createdAt' | 'updatedAt'>;

export type AgentProfileUpdateRequest = Pick<AgentProfile, 'id'> &
  Partial<Pick<AgentProfile, 'name' | 'description' | 'customInstructions' | 'toolSelection'>>;

export type AgentProfileDeleteRequest = Pick<AgentProfile, 'id'>;
