/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { chatAgentTypeId, type AgentConfiguration } from '@kbn/agent-builder-common';
import type {
  AgentConfigContext,
  AgentBaseConfiguration,
  AgentTypeDefinition,
  AgentTypeRegistry,
} from '@kbn/agent-builder-server/agents';
import { mergeAgentConfiguration } from '@kbn/agent-builder-server/agents';

/**
 * Resolves an agent type's base configuration for the given context, folding it under the
 * agent's own (raw) configuration to produce the effective configuration used at execution time.
 */
export const createConfigurationResolver = ({
  typeRegistry,
  logger,
}: {
  typeRegistry: AgentTypeRegistry;
  logger: Logger;
}) => {
  const warnedUnknownTypes = new Set<string>();

  const readBaseConfiguration = async (
    type: AgentTypeDefinition,
    ctx: AgentConfigContext
  ): Promise<AgentBaseConfiguration> => {
    const base = type.baseConfiguration ?? {};
    return typeof base === 'function' ? base(ctx) : base;
  };

  const resolveBaseConfiguration = async (
    typeId: string,
    ctx: AgentConfigContext
  ): Promise<AgentBaseConfiguration> => {
    let type = typeRegistry.get(typeId);
    if (!type) {
      if (!warnedUnknownTypes.has(typeId)) {
        warnedUnknownTypes.add(typeId);
        logger.warn(
          `Agent references unknown agent type "${typeId}", falling back to the "${chatAgentTypeId}" type's base configuration`
        );
      }
      type = typeRegistry.get(chatAgentTypeId);
    }
    return type ? readBaseConfiguration(type, ctx) : {};
  };

  const resolveRegisteredBaseConfiguration = async (
    typeId: string,
    ctx: AgentConfigContext
  ): Promise<AgentBaseConfiguration | undefined> => {
    const type = typeRegistry.get(typeId);
    return type ? readBaseConfiguration(type, ctx) : undefined;
  };

  const resolveConfig = async ({
    agentType,
    configuration,
    ctx,
  }: {
    agentType: string;
    configuration: AgentConfiguration;
    ctx: AgentConfigContext;
  }): Promise<AgentConfiguration> => {
    const base = await resolveBaseConfiguration(agentType, ctx);
    return mergeAgentConfiguration(base, configuration);
  };

  // `resolveBase` is exposed alongside the merged result because callers that need to distinguish
  // the type's contribution from the agent's own configuration cannot recover it from the merge:
  // the two are unioned, so an entry present in both is indistinguishable afterwards.
  return { resolveConfig, resolveBase: resolveRegisteredBaseConfiguration };
};

export type ConfigurationResolver = ReturnType<typeof createConfigurationResolver>;
