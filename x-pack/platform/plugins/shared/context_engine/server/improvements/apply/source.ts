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

/**
 * Applies the source half of an improvement.
 *
 * Sources live on the AI index registry entry rather than in a workflow, so every change here is a
 * read-modify-write of the whole `sources` array. Connector sources are re-validated against the
 * approving user's own actions client, which is what stops an approval from attaching a connector
 * the approver cannot see.
 */

export interface SourceApplyContext {
  aiIndexService: AiIndexService;
  aiIndexId: string;
  actions: ActionsPluginStart;
  request: KibanaRequest;
}

/** Sources have no id of their own, so `value` is the only handle a suggestion can name. */
const sameSource = (source: AiIndexSource, value: string): boolean => source.value === value;

const writeSources = async (
  { aiIndexService, aiIndexId, actions, request }: SourceApplyContext,
  sources: AiIndexSource[]
): Promise<void> => {
  await validateConnectorSources({ sources, actions, request });

  const aiIndex = await aiIndexService.get(aiIndexId);
  await aiIndexService.put(aiIndexId, {
    description: aiIndex.description,
    dest: aiIndex.dest,
    automations: aiIndex.automations,
    sources,
  });
};

/** Adds a source, treating an identical existing one as already done rather than duplicating it. */
export const addSource = async (
  context: SourceApplyContext,
  source: AiIndexSource
): Promise<string> => {
  const { sources } = await context.aiIndexService.get(context.aiIndexId);

  if (sources.some((existing) => sameSource(existing, source.value))) {
    return source.value;
  }

  await writeSources(context, [...sources, source]);
  return source.value;
};

/** Replaces one source with the suggested replacement, which may change its type as well as value. */
export const editSource = async (
  context: SourceApplyContext,
  sourceValue: string,
  source: AiIndexSource
): Promise<string> => {
  const { sources } = await context.aiIndexService.get(context.aiIndexId);

  if (!sources.some((existing) => sameSource(existing, sourceValue))) {
    throw new ApplyImprovementError(
      `Source [${sourceValue}] is no longer configured on this AI index. It may have been changed since the suggestion was made.`
    );
  }

  await writeSources(
    context,
    sources.map((existing) => (sameSource(existing, sourceValue) ? source : existing))
  );
  return source.value;
};

/**
 * Detaches a source. The indicators an automation already generated from it are left alone — they
 * age out or are regenerated on the next run, so removing a source is not a way to remove content.
 */
export const removeSource = async (
  context: SourceApplyContext,
  sourceValue: string
): Promise<string> => {
  const { sources } = await context.aiIndexService.get(context.aiIndexId);
  const remaining = sources.filter((existing) => !sameSource(existing, sourceValue));

  if (remaining.length === sources.length) {
    throw new ApplyImprovementError(
      `Source [${sourceValue}] is no longer configured on this AI index. It may have been removed already.`
    );
  }

  await writeSources(context, remaining);
  return sourceValue;
};
