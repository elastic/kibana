/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AiIndexResolver } from '@kbn/agent-builder-server';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { ResolvedConfiguration } from '../types';
import { resolveAiIndexCatalog } from './resolve_ai_index_catalog';

export const resolveConfiguration = async (
  configuration: AgentConfiguration,
  {
    aiIndicesEnabled,
    request,
    resolver,
    logger,
  }: {
    aiIndicesEnabled: boolean;
    request: KibanaRequest;
    resolver?: AiIndexResolver;
    logger?: Logger;
  }
): Promise<ResolvedConfiguration> => {
  const base: ResolvedConfiguration = {
    instructions: configuration.instructions ?? '',
    aiIndices: configuration.ai_indices ?? [],
  };

  if (!aiIndicesEnabled) return base;

  return {
    ...base,
    aiIndexCatalog: await resolveAiIndexCatalog({
      aiIndices: base.aiIndices,
      request,
      resolver,
      logger,
    }),
  };
};
