/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/onechat-common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentListOptions {}

export type AgentCreateRequest = Omit<AgentDefinition, 'type'>;

export type AgentUpdateRequest = Pick<AgentDefinition, 'id'> &
  Partial<Pick<AgentDefinition, 'name' | 'description' | 'configuration'>>;

export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;
