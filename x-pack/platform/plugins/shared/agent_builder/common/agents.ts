/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentAccessControl,
  AgentConfiguration,
  AgentDefinition,
} from '@kbn/agent-builder-common';

export interface AgentListOptions {
  /**
   * When true, agents of a managed (non-chat) type are included in the results.
   * Defaults to false
   */
  includeManaged?: boolean;
}

export type AgentCreateRequest = Omit<
  AgentDefinition,
  'type' | 'readonly' | 'created_by' | 'access_control'
> & {
  /**
   * Id of a registered agent type. Defaults to the chat type (empty base).
   */
  type?: string;
  access_control?: Pick<AgentAccessControl, 'access_mode'>;
};

export type AgentUpdateRequest = Partial<
  Pick<AgentDefinition, 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'>
> & {
  access_control?: Pick<AgentAccessControl, 'access_mode'>;
  configuration?: Partial<AgentConfiguration>;
};

export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;

export type AgentAccessControlUpdateRequest = Pick<AgentAccessControl, 'entries'>;
