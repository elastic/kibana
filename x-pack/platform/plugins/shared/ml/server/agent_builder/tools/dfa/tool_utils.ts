/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  IScopedClusterClient,
} from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { MlCapabilitiesKey, ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { MlLicense } from '../../../../common/license';
import type { MlFeatures } from '../../../../common/constants/app';
import type { MlAuthorizationService } from '../../../lib/capabilities/check_capabilities';
import { hasMlCapabilitiesProvider } from '../../../lib/capabilities/check_capabilities';
import type { MlClient } from '../../../lib/ml_client';
import type { BuildMlClientFn } from '../../ml_client_factory';

export interface DfaToolDeps {
  resolveMlCapabilities: ResolveMlCapabilities;
  authorization?: MlAuthorizationService;
  mlLicense?: MlLicense;
  enabledFeatures?: MlFeatures;
  buildMlClient?: BuildMlClientFn;
  getDataViews?: () => DataViewsPluginStart | null;
}

export interface DfaJobRecord {
  id?: string;
  description?: string;
  state?: string;
  source?: { index?: string | string[] };
  dest?: { index?: string; results_field?: string };
  analysis?: Record<string, unknown>;
  analyzed_fields?: { includes?: string[]; excludes?: string[] };
  model_memory_limit?: string;
  progress?: Array<{ phase?: string; progress_percent?: number }>;
  data_counts?: {
    training_docs_count?: number;
    test_docs_count?: number;
    skipped_docs_count?: number;
  };
  memory_usage?: { status?: string; peak_usage_bytes?: number };
}

interface EsErrorShape {
  statusCode?: number;
  message?: string;
  body?: {
    error?: { type?: string; reason?: string; root_cause?: Array<{ reason?: string }> };
  };
}

/** Turns an Elasticsearch security failure into the index and action the user lacks. */
export function formatDfaToolError(action: string, err: unknown): string {
  const error = err as EsErrorShape;
  const type = error.body?.error?.type;
  const reason =
    error.body?.error?.reason ??
    error.body?.error?.root_cause?.[0]?.reason ??
    (err instanceof Error ? err.message : String(err));
  if (error.statusCode === 403 || type === 'security_exception') {
    return `The current user cannot ${action}. Elasticsearch returned a security_exception: ${reason}. This is an index or cluster privilege check on that user, not a generic failure.`;
  }
  return `Could not ${action}: ${reason}`;
}

export function errorResults(message: string) {
  return { results: [createErrorResult(message)] };
}

export function dataResults(data: object) {
  return {
    results: [{ type: ToolResultType.other as const, data: data as Record<string, unknown> }],
  };
}

export async function requirePrivilege(
  deps: DfaToolDeps,
  request: KibanaRequest,
  capability: MlCapabilitiesKey
) {
  const hasMlCapabilities = hasMlCapabilitiesProvider(
    deps.resolveMlCapabilities,
    request,
    deps.authorization,
    deps.mlLicense,
    deps.enabledFeatures
  );
  try {
    await hasMlCapabilities([capability]);
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResults(`Missing Machine Learning privilege ${capability}: ${message}`);
  }
}

export async function requireMlClient(
  deps: DfaToolDeps,
  request: KibanaRequest,
  esClient: IScopedClusterClient,
  savedObjectsClient: SavedObjectsClientContract,
  capability: MlCapabilitiesKey
): Promise<{ mlClient: MlClient } | { error: ReturnType<typeof errorResults> }> {
  const denied = await requirePrivilege(deps, request, capability);
  if (denied) {
    return { error: denied };
  }
  const mlClient = deps.buildMlClient?.(esClient, savedObjectsClient, request);
  if (!mlClient) {
    return { error: errorResults('ML client is unavailable — service not yet started') };
  }
  return { mlClient };
}

/** Counts documents in the source index as the current user. Returns undefined when the count fails. */
export async function countSourceDocuments(
  esClient: IScopedClusterClient,
  index: string
): Promise<number | undefined> {
  try {
    const response = await esClient.asCurrentUser.count({ index });
    return typeof response.count === 'number' ? response.count : undefined;
  } catch {
    return undefined;
  }
}

export function jobsFrom(response: unknown): DfaJobRecord[] {
  const body = response as { data_frame_analytics?: DfaJobRecord[] };
  return body.data_frame_analytics ?? [];
}

export function analysisTypeOf(job: DfaJobRecord): string | undefined {
  const keys = Object.keys(job.analysis ?? {});
  return keys.length === 1 ? keys[0] : undefined;
}

export function slimJob(config: DfaJobRecord | undefined, stats: DfaJobRecord | undefined) {
  const job = config ?? stats;
  return {
    id: job?.id,
    description: config?.description,
    analysis_type: config ? analysisTypeOf(config) : undefined,
    analysis: config?.analysis,
    source_index: config?.source?.index,
    dest_index: config?.dest?.index,
    results_field: config?.dest?.results_field ?? 'ml',
    analyzed_fields: config?.analyzed_fields,
    model_memory_limit: config?.model_memory_limit,
    state: stats?.state,
    progress: stats?.progress,
    data_counts: stats?.data_counts,
    memory_usage: stats?.memory_usage,
  };
}
