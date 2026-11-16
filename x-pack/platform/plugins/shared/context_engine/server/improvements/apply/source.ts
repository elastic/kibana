/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { AiIndexSource } from '../../../common/http_api/ai_indices';
import type { AiIndexService } from '../../ai_indices/service';
import { validateConnectorSources } from '../../ai_indices/validate_connector_sources';
import { ApplyImprovementError } from './errors';

export interface SourceApplyContext {
  aiIndexService: AiIndexService;
  aiIndexId: string;
  spaceId: string;
  actions: ActionsPluginStart;
  request: KibanaRequest;
}

const sameSource = (source: AiIndexSource, value: string): boolean => source.value === value;

const writeSources = async (
  { aiIndexService, aiIndexId, spaceId, actions, request }: SourceApplyContext,
  aiIndex: Awaited<ReturnType<AiIndexService['get']>>,
  sources: AiIndexSource[]
): Promise<void> => {
  await validateConnectorSources({ sources, actions, request });
  await aiIndexService.put(aiIndexId, spaceId, {
    description: aiIndex.description,
    dest: aiIndex.dest,
    automations: aiIndex.automations,
    sources,
    traces: aiIndex.traces,
  });
};

/** Adds a source to the AI index unless an identical one is already configured. */
export const addSource = async (
  context: SourceApplyContext,
  source: AiIndexSource
): Promise<string> => {
  const aiIndex = await context.aiIndexService.get(context.aiIndexId, context.spaceId);
  const { sources } = aiIndex;

  if (sources.some((existing) => sameSource(existing, source.value))) {
    return source.value;
  }

  await writeSources(context, aiIndex, [...sources, source]);
  return source.value;
};

/** Replaces a source on the AI index with the suggested one. */
export const editSource = async (
  context: SourceApplyContext,
  sourceValue: string,
  source: AiIndexSource
): Promise<string> => {
  const aiIndex = await context.aiIndexService.get(context.aiIndexId, context.spaceId);
  const { sources } = aiIndex;

  if (!sources.some((existing) => sameSource(existing, sourceValue))) {
    throw new ApplyImprovementError(
      `Source [${sourceValue}] is no longer configured on this AI index. It may have been changed since the suggestion was made.`
    );
  }

  await writeSources(
    context,
    aiIndex,
    sources.map((existing) => (sameSource(existing, sourceValue) ? source : existing))
  );
  return source.value;
};

/** Detaches a source from the AI index. */
export const removeSource = async (
  context: SourceApplyContext,
  sourceValue: string
): Promise<string> => {
  const aiIndex = await context.aiIndexService.get(context.aiIndexId, context.spaceId);
  const { sources } = aiIndex;
  const remaining = sources.filter((existing) => !sameSource(existing, sourceValue));

  if (remaining.length === sources.length) {
    throw new ApplyImprovementError(
      `Source [${sourceValue}] is no longer configured on this AI index. It may have been removed already.`
    );
  }

  await writeSources(context, aiIndex, remaining);
  return sourceValue;
};
