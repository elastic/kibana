/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// Single-cluster CCR: the remote points at the test node's own transport address.

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

// Worst-case ceiling under CI load; normally a couple of seconds. Exported so
// callers can size their hook timeout against it.
export const REMOTE_CONNECT_TIMEOUT_MS = 30_000;
const CONNECT_POLL_INTERVAL_MS = 1_000;

export const registerSelfReferentialRemote = async (
  esClient: EsClient,
  name: string
): Promise<void> => {
  const seed = await resolveTransportSeed(esClient);
  await esClient.cluster.putSettings({
    persistent: { cluster: { remote: { [name]: { seeds: [seed] } } } },
  });

  await expect
    .poll(async () => Boolean((await esClient.cluster.remoteInfo())[name]?.connected), {
      timeout: REMOTE_CONNECT_TIMEOUT_MS,
      intervals: [CONNECT_POLL_INTERVAL_MS],
      message: `Remote cluster '${name}' did not connect`,
    })
    .toBe(true);
};

export const removeRemote = async (esClient: EsClient, name: string): Promise<void> => {
  await esClient.cluster.putSettings({
    persistent: { cluster: { remote: { [name]: { seeds: null } } } },
  });
};
