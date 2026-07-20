/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { AgentConfigContext } from './builtin_definition';
import type { AgentBaseConfiguration } from './merge_configuration';

/**
 * An agent type, registered in code via the agents setup contract.
 *
 * A type carries a managed, read-only base configuration. Agents referencing the type
 * resolve their effective configuration by merging the base under their own config at
 * read time, so base updates ship with code deploys and never touch agent-level data.
 */
export interface AgentTypeDefinition {
  /**
   * Stable id referenced by agents, e.g. "investigation".
   */
  id: string;
  /**
   * Human-readable name for the type, e.g. "Investigation".
   */
  name?: string;
  /**
   * Human-readable description of what agents of this type do.
   */
  description?: string;
  /**
   * Optional eui icon used to represent the type in the UI.
   */
  avatar_icon?: string;
  /**
   * The managed base configuration this type contributes to its agents. Static or a
   * function of context, mirroring {@link BuiltInAgentDefinition}'s configuration, so a
   * base can vary by space or feature flag without going stale.
   */
  baseConfiguration:
    | AgentBaseConfiguration
    | ((ctx: AgentConfigContext) => MaybePromise<AgentBaseConfiguration>);
}

/**
 * In-memory registry of {@link AgentTypeDefinition | agent types}. Types are code-owned,
 * registered at setup, and never persisted. Implemented by the agentBuilder plugin.
 */
export interface AgentTypeRegistry {
  /**
   * Register an agent type. Throws if the id is already registered or not allow-listed.
   */
  register(type: AgentTypeDefinition): void;
  has(typeId: string): boolean;
  get(typeId: string): AgentTypeDefinition | undefined;
  list(): AgentTypeDefinition[];
}
