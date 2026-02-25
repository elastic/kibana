/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const listRemoteClustersSchema = z.object({});

/**
 * Platform tool that lists the remote clusters configured for cross-cluster search (CCS).
 *
 * Uses the Elasticsearch `GET /_remote/info` API (`cluster.remoteInfo()`) to discover
 * configured remote clusters and their connection status. The LLM can then use the
 * returned cluster names with other tools via `cluster:index` patterns
 * (e.g. `remote_cluster:logs-*`).
 */
export const listRemoteClustersTool = (): BuiltinToolDefinition<
  typeof listRemoteClustersSchema
> => {
  return {
    id: platformCoreTools.listRemoteClusters,
    type: ToolType.builtin,
    description: `List the remote clusters configured for cross-cluster search (CCS).

    Use this tool to discover available remote clusters before targeting them with other tools.
    Once you know the cluster names, use them with cluster:index patterns in other tools
    (e.g. list_indices with pattern 'my_remote:logs-*', or search with index 'my_remote:my-index').

    If no remote clusters are configured, the result will be an empty list.`,
    schema: listRemoteClustersSchema,
    handler: async (_params, { esClient, logger }) => {
      logger.debug('list_remote_clusters tool called');

      const remoteInfo = await esClient.asCurrentUser.cluster.remoteInfo();

      const clusters = Object.entries(remoteInfo).map(([name, info]) => ({
        name,
        connected: info.connected,
        mode: info.mode,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              clusters,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
