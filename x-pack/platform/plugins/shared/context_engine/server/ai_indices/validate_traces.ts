/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AgentsStart } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import pLimit from 'p-limit';
import type { AiIndexTrace } from '../../common/http_api/ai_indices';
import { InvalidAiIndexTraceError } from './errors';

// Bound concurrent resolveIndex calls so one request cannot fan out unbounded ES traffic.
const RESOLVE_INDEX_CONCURRENCY = 10;

const resolveExpression = async (
  expression: string,
  esClient: ElasticsearchClient
): Promise<estypes.IndicesResolveIndexResponse> => {
  try {
    return await esClient.indices.resolveIndex({
      name: expression,
      expand_wildcards: ['open', 'hidden', 'closed'],
    });
  } catch (error) {
    // A concrete name that does not exist answers 404, and a malformed one answers 400.
    if (isResponseError(error) && (error.statusCode === 404 || error.statusCode === 400)) {
      throw new InvalidAiIndexTraceError(
        `Index trace '${expression}' does not match any index, data stream, or alias`
      );
    }
    throw error;
  }
};

const validateIndexExpression = async (
  expression: string,
  esClient: ElasticsearchClient
): Promise<void> => {
  if (expression === '') {
    throw new InvalidAiIndexTraceError('Index trace value cannot contain an empty expression');
  }

  const {
    indices,
    data_streams: dataStreams,
    aliases,
  } = await resolveExpression(expression, esClient);

  if (indices.length === 0 && dataStreams.length === 0 && aliases.length === 0) {
    throw new InvalidAiIndexTraceError(
      `Index trace '${expression}' does not match any index, data stream, or alias`
    );
  }
};

const validateAgentIds = async (
  agentIds: string[],
  agents: Pick<AgentsStart, 'getRegistry'>,
  request: KibanaRequest
): Promise<void> => {
  const registry = await agents.getRegistry({ request });
  await Promise.all(
    agentIds.map(async (agentId) => {
      if (!(await registry.has(agentId))) {
        throw new InvalidAiIndexTraceError(`Agent '${agentId}' was not found`);
      }
    })
  );
};

/** Asserts every trace points at something that exists. Agent lookups are skipped when `agents` is undefined. */
export const validateTraces = async ({
  traces,
  esClient,
  agents,
  request,
}: {
  traces: AiIndexTrace[];
  esClient: ElasticsearchClient;
  agents: Pick<AgentsStart, 'getRegistry'> | undefined;
  request: KibanaRequest;
}): Promise<void> => {
  const checks: Array<Promise<void>> = [];

  if (agents) {
    const agentIds = [
      ...new Set(
        traces.filter((trace) => trace.type === 'elastic_agent').map((trace) => trace.value)
      ),
    ];
    if (agentIds.length > 0) {
      checks.push(validateAgentIds(agentIds, agents, request));
    }
  }

  // Split on commas so that a resolvable first expression cannot smuggle a second one into `FROM`.
  const expressions = new Set(
    traces
      .filter((trace) => trace.type === 'index')
      .flatMap((trace) => trace.value.split(',').map((expression) => expression.trim()))
  );
  const limit = pLimit(RESOLVE_INDEX_CONCURRENCY);
  for (const expression of expressions) {
    checks.push(limit(() => validateIndexExpression(expression, esClient)));
  }

  await Promise.all(checks);
};
