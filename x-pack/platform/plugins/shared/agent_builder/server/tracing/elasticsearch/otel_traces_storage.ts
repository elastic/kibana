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

export const otelTracesIndexName = chatSystemIndex('otel-traces');

const storageSettings = {
  name: otelTracesIndexName,
  schema: {
    properties: {
      trace_id: types.keyword({}),
      span_id: types.keyword({}),
      parent_span_id: types.keyword({}),
      name: types.keyword({}),
      kind: types.keyword({}),
      status_code: types.keyword({}),
      status_message: types.text({}),
      start_time: types.date({}),
      end_time: types.date({}),
      duration_ms: types.float({}),
      agent_id: types.keyword({}),
      conversation_id: types.keyword({}),
      operation_name: types.keyword({}),
      inference_span_kind: types.keyword({}),
      model: types.keyword({}),
      input_tokens: types.long({}),
      output_tokens: types.long({}),
      attributes: types.flattened(),
      events: types.object({ dynamic: false, properties: {} }),
      resource: types.flattened(),
      space: types.keyword({}),
      '@timestamp': types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface OtelTraceDocumentProperties {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: string;
  status_code: string;
  status_message?: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  agent_id?: string;
  conversation_id?: string;
  operation_name?: string;
  inference_span_kind?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  attributes: Record<string, unknown>;
  events?: Array<{
    name: string;
    time: string;
    attributes?: Record<string, unknown>;
  }>;
  resource: Record<string, unknown>;
  space?: string;
  '@timestamp': string;
}

export type OtelTracesStorageSettings = typeof storageSettings;

export type OtelTracesStorage = StorageIndexAdapter<
  OtelTracesStorageSettings,
  OtelTraceDocumentProperties
>;

export const createOtelTracesStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): OtelTracesStorage => {
  return new StorageIndexAdapter<OtelTracesStorageSettings, OtelTraceDocumentProperties>(
    esClient,
    logger,
    storageSettings
  );
};
