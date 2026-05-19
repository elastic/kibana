/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import {
  buildPolicyUsage,
  normalizeIlmPhases,
  type IlmPoliciesResponse,
} from '../../../lib/streams/lifecycle/ilm_policies';
import { processAsyncInChunks } from '../../../utils/process_async_in_chunks';
import { STREAMS_LIST_ILM_POLICIES_TOOL_ID as LIST_ILM_POLICIES } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';

const listIlmPoliciesSchema = z.object({});

const getDataStreamByBackingIndices = async (
  scopedClusterClient: IScopedClusterClient,
  policiesResponse: IlmPoliciesResponse
): Promise<Record<string, string>> => {
  const inUseIndices = Array.from(
    new Set(
      Object.values(policiesResponse).flatMap((policyEntry) => policyEntry.in_use_by?.indices ?? [])
    )
  );

  if (inUseIndices.length === 0) {
    return {};
  }

  const indexResponse = await processAsyncInChunks<IndicesGetResponse>(
    inUseIndices,
    async (indicesChunk) =>
      scopedClusterClient.asCurrentUser.indices.get({
        index: indicesChunk,
        allow_no_indices: true,
        ignore_unavailable: true,
        filter_path: ['*.data_stream'],
      })
  );

  return Object.fromEntries(
    Object.entries(indexResponse).flatMap(([indexName, indexData]) => {
      const { data_stream: dataStream } = indexData;
      return dataStream ? [[indexName, dataStream]] : [];
    })
  );
};

export const createListIlmPoliciesTool = ({
  getScopedClients,
  isServerless,
}: {
  getScopedClients: GetScopedClients;
  isServerless: boolean;
}): BuiltinToolDefinition<typeof listIlmPoliciesSchema> => ({
  id: LIST_ILM_POLICIES,
  type: ToolType.builtin,
  description: dedent(`
    List available ILM (Index Lifecycle Management) policies on this cluster.

    **When to use:**
    - User wants to set ILM retention but doesn't know the policy name
    - User asks "what ILM policies are available?" or "show me lifecycle policies"
    - Before suggesting an ILM policy in update_stream — verify the policy exists

    Returns policy names, full phase definitions (with min_age, rollover, delete settings),
    managed/deprecated status, and which streams and indices currently use each policy.
    Internal system policies (managed + dot-prefixed) are filtered out.
    On serverless deployments, returns ilm_available: false.

    **Efficiency:** ILM policies are cluster-global. Call once per conversation, not per stream.
    Results remain valid until the user creates or modifies policies (outside this skill's scope).
  `),
  tags: ['streams'],
  schema: listIlmPoliciesSchema,
  handler: async (_input, { request }) => {
    if (isServerless) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              ilm_available: false,
              reason:
                'ILM is not available on serverless deployments. Use DSL retention (data_retention) instead.',
              policies: [],
            },
          },
        ],
      };
    }

    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      const policiesResponse = (await esClient.ilm.getLifecycle()) as IlmPoliciesResponse;
      const dataStreamByBackingIndices = await getDataStreamByBackingIndices(
        scopedClusterClient,
        policiesResponse
      );

      const policies = Object.entries(policiesResponse)
        .filter(([policyName, policyEntry]) => {
          const isManaged = policyEntry.policy?._meta?.managed === true;
          return !(isManaged && policyName.startsWith('.'));
        })
        .map(([policyName, policyEntry]) => {
          const { in_use_by } = buildPolicyUsage(policyEntry, dataStreamByBackingIndices);
          const phases = normalizeIlmPhases(policyEntry.policy?.phases);

          return {
            name: policyName,
            phases,
            managed: policyEntry.policy?._meta?.managed === true,
            deprecated: policyEntry.policy?.deprecated ?? false,
            in_use_by_streams: in_use_by.data_streams,
            in_use_by_indices: in_use_by.indices,
          };
        });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              ilm_available: true,
              policy_count: policies.length,
              policies,
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to list ILM policies: ${message}`,
              operation: 'list_ilm_policies',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
