/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AiIndexResolver, DefaultAiIndexProvider } from '@kbn/agent-builder-server';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { ResolvedConfiguration } from '../types';
import { resolveAiIndexCatalog } from './resolve_ai_index_catalog';

export const resolveConfiguration = async (
  configuration: AgentConfiguration,
  {
    aiIndicesEnabled,
    request,
    resolver,
    defaultAiIndexProvider,
    logger,
  }: {
    aiIndicesEnabled: boolean;
    request: KibanaRequest;
    resolver?: AiIndexResolver;
    defaultAiIndexProvider?: DefaultAiIndexProvider;
    logger?: Logger;
  }
): Promise<ResolvedConfiguration> => {
  const base: ResolvedConfiguration = {
    instructions: configuration.instructions ?? '',
    aiIndices: configuration.ai_indices ?? [],
  };

  if (!aiIndicesEnabled) return base;

  const aiIndices = await withDefaultAiIndices(base.aiIndices, {
    request,
    defaultAiIndexProvider,
    logger,
  });

  return {
    ...base,
    aiIndices,
    aiIndexCatalog: await resolveAiIndexCatalog({
      aiIndices,
      request,
      resolver,
      logger,
    }),
  };
};

const withDefaultAiIndices = async (
  aiIndices: string[],
  {
    request,
    defaultAiIndexProvider,
    logger,
  }: {
    request: KibanaRequest;
    defaultAiIndexProvider?: DefaultAiIndexProvider;
    logger?: Logger;
  }
): Promise<string[]> => {
  if (!defaultAiIndexProvider) return aiIndices;

  try {
    const defaults = await defaultAiIndexProvider({ request });
    return [...new Set([...aiIndices, ...defaults])];
  } catch (error) {
    logger?.warn(`Failed to resolve default AI indices: ${error.message}`);
    return aiIndices;
  }
};
