/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { AgentDefinition, AgentConfiguration } from '@kbn/agent-builder-common';

/** Same type for now */
export type BuiltInAgentConfiguration = AgentConfiguration;

/**
 * Context passed to dynamic configuration handlers.
 */
export interface AgentConfigContext {
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Represents a built-in agent definition, as registered by the consumers using the agents setup contract.
 */
export type BuiltInAgentDefinition = Pick<
  AgentDefinition,
  'id' | 'name' | 'description' | 'labels' | 'avatar_icon' | 'avatar_symbol' | 'avatar_color'
> & {
  configuration:
    | BuiltInAgentConfiguration
    | ((ctx: AgentConfigContext) => MaybePromise<BuiltInAgentConfiguration>);
  /**
   * Optional dynamic availability configuration.
   */
  availability?: AgentAvailabilityConfig;
};

/**
 * Information exposed to the {@link AgentAvailabilityHandler}.
 */
export interface AgentAvailabilityContext {
  request: KibanaRequest;
  uiSettings: IUiSettingsClient;
  spaceId: string;
}

/**
 * Information exposed to the {@link AgentAvailabilityHandler}.
 */
export interface AgentAvailabilityResult {
  /**
   * Whether the agent is available or not.
   */
  status: 'available' | 'unavailable';
  /**
   * Optional reason for why the agent is unavailable.
   */
  reason?: string;
}

/**
 * Availability handler for an agent.
 */
export type AgentAvailabilityHandler = (
  context: AgentAvailabilityContext
) => MaybePromise<AgentAvailabilityResult>;

export interface AgentAvailabilityConfig {
  /**
   * handler which can be defined to add conditional availability of the agent.
   */
  handler: AgentAvailabilityHandler;
  /**
   * Cache mode for the result
   * - global: the result will be cached globally, for all spaces
   * - space: the result will be cached per-space
   * - none: the result shouldn't be cached (warning: this can lead to performance issues)
   */
  cacheMode: 'global' | 'space' | 'none';
  /**
   * Optional TTL for the cached result, *in seconds*.
   * Default to 300 seconds (5 minutes).
   */
  cacheTtl?: number;
}
