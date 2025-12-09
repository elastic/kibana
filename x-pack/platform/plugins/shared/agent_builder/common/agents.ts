/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition, AgentConfiguration } from '@kbn/agent-builder-common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentListOptions {}

export type AgentCreateRequest = Omit<AgentDefinition, 'type' | 'readonly'>;

export type AgentUpdateRequest = Partial<
  Pick<AgentDefinition, 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'>
> & {
  configuration?: Partial<AgentConfiguration>;
};

export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;
