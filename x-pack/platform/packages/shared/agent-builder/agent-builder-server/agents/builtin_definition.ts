/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentDefinition, AgentConfiguration } from '@kbn/agent-builder-common';
import type {
  AvailabilityContext,
  AvailabilityResult,
  AvailabilityHandler,
  AvailabilityConfig,
} from '../availability';

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
  /**
   * Id of a registered agent type. Defaults to the chat type (empty base).
   * The type must be registered before the agent.
   */
  type?: string;
  /**
   * When true, the agent is hidden from UI listings (agent picker, management page) by default.
   * An admin can opt in to see hidden agents via a toggle on the management page.
   */
  hidden?: boolean;
  configuration:
    | BuiltInAgentConfiguration
    | ((ctx: AgentConfigContext) => MaybePromise<BuiltInAgentConfiguration>);
  /**
   * Optional dynamic availability configuration.
   */
  availability?: AgentAvailabilityConfig;
};

/**
 * Agent-specific aliases for the shared availability types.
 * See {@link AvailabilityConfig} for full documentation.
 */
export type AgentAvailabilityContext = AvailabilityContext;
export type AgentAvailabilityResult = AvailabilityResult;
export type AgentAvailabilityHandler = AvailabilityHandler;
export type AgentAvailabilityConfig = AvailabilityConfig;
