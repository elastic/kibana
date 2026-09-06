/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition, AgentConfiguration } from './definition';
import type { AgentAccessControl } from './access_control';

export interface AgentListOptions {
  /**
   * When true, agents of a managed (non-chat) type are included in the results.
   * Defaults to false.
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
  /**
   * AB-004: when true the agent is created readonly (package-managed).
   * Fleet package installs set this so UI edits warn/block, mirroring the
   * managed workflow pattern. Carried on update so package upgrades keep it.
   */
  readonly?: boolean;
};

export type AgentUpdateRequest = Partial<
  Pick<AgentDefinition, 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'>
> & {
  access_control?: Pick<AgentAccessControl, 'access_mode'>;
  configuration?: Partial<AgentConfiguration>;
  /**
   * AB-004: package upgrades re-assert the managed flag; a reinstall must not
   * silently downgrade a package agent to an editable user agent.
   */
  readonly?: boolean;
};

export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;
