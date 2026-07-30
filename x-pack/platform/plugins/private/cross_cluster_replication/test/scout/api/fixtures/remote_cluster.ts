/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

// CCR runs on a single cluster by pointing a remote cluster at the test node's
// own transport address, mirroring the original FTR's `localhost:9300` seed.

const resolveTransportSeed = async (esClient: EsClient): Promise<string> => {
  const info = await esClient.nodes.info({
    node_id: '_local',
    filter_path: ['nodes.*.transport.publish_address'],
  });
  const node = Object.values(info.nodes ?? {})[0];
  const publishAddress = node?.transport?.publish_address;
  if (!publishAddress) {
    throw new Error('Unable to resolve the Elasticsearch transport publish address');
  }
  // Older ES versions format this as `hostname/ip:port`; keep only `ip:port`.
  return publishAddress.includes('/') ? publishAddress.split('/').slice(-1)[0] : publishAddress;
};

export const registerSelfReferentialRemote = async (
  esClient: EsClient,
  name: string
): Promise<void> => {
  const seed = await resolveTransportSeed(esClient);
  await esClient.cluster.putSettings({
    persistent: { cluster: { remote: { [name]: { seeds: [seed] } } } },
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    const remoteInfo = await esClient.cluster.remoteInfo();
    if (remoteInfo[name]?.connected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Remote cluster '${name}' did not connect within the timeout`);
};

export const removeRemote = async (esClient: EsClient, name: string): Promise<void> => {
  await esClient.cluster.putSettings({
    persistent: { cluster: { remote: { [name]: { seeds: null } } } },
  });
};
