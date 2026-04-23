/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { otelTracesIndexName } from './otel_traces_storage';
import { spanToDocument } from './span_to_document';

enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1,
}

export class ElasticsearchSpanExporter implements tracing.SpanExporter {
  private isShutdown = false;
  private indexReady = false;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  private async ensureIndex(): Promise<void> {
    if (this.indexReady) return;

    try {
      const exists = await this.esClient.indices.exists({ index: otelTracesIndexName });
      if (!exists) {
        await this.esClient.indices.create({
          index: otelTracesIndexName,
          mappings: {
            dynamic: false,
            properties: {
              trace_id: { type: 'keyword' },
              span_id: { type: 'keyword' },
              parent_span_id: { type: 'keyword' },
              name: { type: 'keyword' },
              kind: { type: 'keyword' },
              status_code: { type: 'keyword' },
              status_message: { type: 'text' },
              start_time: { type: 'date' },
              end_time: { type: 'date' },
              duration_ms: { type: 'float' },
              agent_id: { type: 'keyword' },
              conversation_id: { type: 'keyword' },
              operation_name: { type: 'keyword' },
              inference_span_kind: { type: 'keyword' },
              model: { type: 'keyword' },
              input_tokens: { type: 'long' },
              output_tokens: { type: 'long' },
              attributes: { type: 'flattened' },
              events: { type: 'object', dynamic: false },
              resource: { type: 'flattened' },
              space: { type: 'keyword' },
              '@timestamp': { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
          },
        });
        this.logger.info(`Created OTel traces index: ${otelTracesIndexName}`);
      }
      this.indexReady = true;
    } catch (error) {
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        this.indexReady = true;
        return;
      }
      throw error;
    }
  }

  async export(
    spans: tracing.ReadableSpan[],
    resultCallback: (result: { code: ExportResultCode; error?: Error }) => void
  ): Promise<void> {
    if (this.isShutdown) {
      resultCallback({ code: ExportResultCode.FAILED, error: new Error('Exporter is shut down') });
      return;
    }

    if (spans.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    try {
      await this.ensureIndex();

      const body = spans.flatMap((span) => {
        const doc = spanToDocument(span);
        return [{ index: { _index: otelTracesIndexName } }, doc];
      });

      const response = await this.esClient.bulk({ body, refresh: false });

      if (response.errors) {
        const failedItems = response.items.filter((item) => item.index?.error);
        this.logger.warn(
          `Failed to index ${failedItems.length}/${spans.length} OTel trace spans: ${JSON.stringify(failedItems[0]?.index?.error)}`
        );
      }

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      this.logger.error(`Failed to export OTel trace spans to Elasticsearch: ${error.message}`);
      resultCallback({ code: ExportResultCode.FAILED, error });
    }
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;
  }

  async forceFlush(): Promise<void> {}
}
