/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentDefinition, AgentConfiguration } from '@kbn/onechat-common';

/**
 * Context which can be used for dynamic resolvers of built-in agents.
 */
export interface BuiltInAgentDefinitionContext {
  request: KibanaRequest;
}

/** */
export type BuiltInAgentConfiguration = AgentConfiguration;
export type BuiltInAgentConfigurationAccessor = (
  context: BuiltInAgentDefinitionContext
) => MaybePromise<BuiltInAgentConfiguration>;

/**
 * Represents a built-in agent definition, as registered by the consumers using the agents setup contract.
 */
export type BuiltInAgentDefinition = Pick<
  AgentDefinition,
  'id' | 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'
> & {
  /**
   * Dynamic accessor which can be used to restrict access to the agent based on arbitrary criteria.
   *
   * When no implemented, will default to always be available.
   */
  isAvailable?: (context: BuiltInAgentDefinitionContext) => MaybePromise<boolean>;
  /**
   * Either a static configuration, or a dynamic configuration accessor, for the agent's config.
   */
  configuration: BuiltInAgentConfiguration | BuiltInAgentConfigurationAccessor;
};
