/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize, find, get, includes } from 'lodash';
import { i18n } from '@kbn/i18n';

export function decorateShards(shards, nodes) {
  function getTooltipMessage(shard) {
    const isRelocating = node => includes(node.node_ids, shard.relocating_node);
    const nodeName = get(
      find(nodes, n => isRelocating(n)),
      'name'
    );

    // messages for relocating node
    if (nodeName) {
      if (shard.state === 'INITIALIZING') {
        return i18n.translate(
          'xpack.monitoring.elasticsearch.shardAllocation.decorateShards.relocatingFromTextMessage',
          {
            defaultMessage: 'Relocating from {nodeName}',
            values: {
              nodeName,
            },
          }
        );
      }
      if (shard.state === 'RELOCATING') {
        return i18n.translate(
          'xpack.monitoring.elasticsearch.shardAllocation.decorateShards.relocatingToTextMessage',
          {
            defaultMessage: 'Relocating to {nodeName}',
            values: {
              nodeName,
            },
          }
        );
      }
    }
    return capitalize(shard.state.toLowerCase());
  }

  return shards.map(shard => {
    const node = nodes[shard.node];
    shard.nodeName = (node && node.name) || null;
    shard.type = 'shard';
    shard.tooltip_message = getTooltipMessage(shard);
    return shard;
  });
}
