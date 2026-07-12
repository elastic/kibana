/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { OpencodeRunProgress } from '../types';

/**
 * Persisted OpenCode sub-agent runs, keyed by conversation. Because sandbox pods
 * are torn down after each run, this index is what lets the Sandbox executions
 * flyout show finished runs (their activity timeline + pod metadata) long after
 * the pod is gone, and survives Kibana restarts.
 */
export const opencodeRunIndexName = chatSystemIndex('opencode-runs');

const storageSettings = {
  name: opencodeRunIndexName,
  schema: {
    properties: {
      run_id: types.keyword({}),
      conversation_id: types.keyword({}),
      agent_id: types.keyword({}),
      execution_id: types.keyword({}),
      space_id: types.keyword({}),
      '@timestamp': types.date({}),
      updated_at: types.date({}),
      status: types.keyword({}),
      prompt: types.text({}),
      answer: types.text({}),
      error: types.text({}),
      pod_name: types.keyword({}),
      // Compute provider this run actually used (local-k8s | cloud-run).
      provider: types.keyword({}),
      // Human environment label (kube-context for local-k8s; "project / region"
      // for cloud-run). Kept under the legacy `kube_context` name for back-compat.
      kube_context: types.keyword({}),
      namespace: types.keyword({}),
      item_count: types.long({}),
      // The full activity timeline; stored opaquely (we render it on the client).
      timeline: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export type OpencodeRunStatus = 'running' | 'completed' | 'error';

export interface OpencodeRunProperties {
  run_id: string;
  conversation_id: string;
  agent_id?: string;
  execution_id?: string;
  space_id: string;
  '@timestamp': string;
  updated_at: string;
  status: OpencodeRunStatus;
  prompt?: string;
  answer?: string;
  error?: string;
  pod_name: string;
  provider?: string;
  kube_context: string;
  namespace: string;
  item_count?: number;
  timeline: OpencodeRunProgress[];
}

export type OpencodeRunStorageSettings = typeof storageSettings;

export type OpencodeRunStorage = StorageIndexAdapter<
  OpencodeRunStorageSettings,
  OpencodeRunProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): OpencodeRunStorage => {
  return new StorageIndexAdapter<OpencodeRunStorageSettings, OpencodeRunProperties>(
    esClient,
    logger,
    storageSettings
  );
};
