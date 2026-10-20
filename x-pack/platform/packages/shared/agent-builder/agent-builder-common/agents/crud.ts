/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition, AgentConfigurationInput } from './definition';
import type { AgentAccessControl } from './access_control';

export interface AgentListOptions {
  /**
   * When true, agents marked as hidden are included in the results.
   * Defaults to false.
   */
  includeHidden?: boolean;
}

export type AgentCreateRequest = Omit<
  AgentDefinition,
  'type' | 'readonly' | 'created_by' | 'access_control' | 'configuration' | 'hidden'
> & {
  /**
   * Id of a registered agent type. Defaults to the chat type (empty base).
   */
  type?: string;
  access_control?: Pick<AgentAccessControl, 'access_mode'>;
  configuration: AgentConfigurationInput;
};

export type AgentUpdateRequest = Partial<
  Pick<AgentDefinition, 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'>
> & {
  access_control?: Pick<AgentAccessControl, 'access_mode'>;
  configuration?: Partial<AgentConfigurationInput>;
};

export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;
