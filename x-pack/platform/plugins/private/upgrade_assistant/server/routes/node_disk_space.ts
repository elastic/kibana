/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodesStatsResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ByteSizeValue } from '@kbn/config-schema';
import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import type { RouteDependencies } from '../types';

interface NodeWithLowDiskSpace {
  nodeId: string;
  nodeName: string;
  available: string;
}

interface NodeWithLowDiskSpace {
  nodeId: string;
  nodeName: string;
  available: string;
}

export function getNodesWithLowDiskSpace(
  nodeStats: NodesStatsResponseBase
): NodeWithLowDiskSpace[] {
  const nodeIds = Object.keys(nodeStats.nodes);

  const nodesWithLowDiskSpace: NodeWithLowDiskSpace[] = [];

  nodeIds.forEach((nodeId) => {
    const node = nodeStats.nodes[nodeId];

    node?.fs?.data?.forEach((dataPath) => {
      // @ts-expect-error low_watermark_free_space_in_bytes is missing from the types
      const lowWatermark = dataPath.low_watermark_free_space_in_bytes;
      const bytesAvailable = dataPath.available_in_bytes;
      const fsWithLowDiskSpace = [];

      if (lowWatermark && bytesAvailable && bytesAvailable < lowWatermark) {
        fsWithLowDiskSpace.push({
          nodeId,
          nodeName: node.name || nodeId,
          available: new ByteSizeValue(bytesAvailable).toString(),
        });
      }

      if (fsWithLowDiskSpace.length > 0) {
        // Having multiple data paths on a single node is deprecated in ES and considered rare
        // If multiple data paths are above the low watermark, pick the one with the lowest available space
        fsWithLowDiskSpace.sort((a, b) => {
          const aBytes = ByteSizeValue.parse(a.available).getValueInBytes();
          const bBytes = ByteSizeValue.parse(b.available).getValueInBytes();
          return aBytes - bBytes;
        });

        nodesWithLowDiskSpace.push(fsWithLowDiskSpace[0]);
      }
    });
  });

  return nodesWithLowDiskSpace;
}

export function registerNodeDiskSpaceRoute({
  router,
  current,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/node_disk_space`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;

        const nodeStats = await client.asCurrentUser.nodes.stats({
          metric: 'fs',
        });

        const nodesWithLowDiskSpace = getNodesWithLowDiskSpace(nodeStats);

        return response.ok({ body: nodesWithLowDiskSpace });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
