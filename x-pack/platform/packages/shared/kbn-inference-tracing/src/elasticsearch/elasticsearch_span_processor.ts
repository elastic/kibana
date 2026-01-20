/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { diag } from '@opentelemetry/api';
import { GenAISemanticConventions } from '../types';

export interface AgentBuilderTraceSpanProcessorConfig {
  indexName: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

/**
 * Span processor that ingests gen_ai spans into Elasticsearch.
 * Only processes spans that have gen_ai.* or elastic.inference.* attributes.
 */
export class AgentBuilderTraceSpanProcessor implements tracing.SpanProcessor {
  private pendingSpans: tracing.ReadableSpan[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private esClient: ElasticsearchClient | null = null;

  private readonly indexName: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;

  constructor(config: AgentBuilderTraceSpanProcessorConfig) {
    this.indexName = config.indexName;
    this.flushIntervalMs = config.flushIntervalMs ?? 5000;
    this.maxBatchSize = config.maxBatchSize ?? 100;
  }

  /**
   * Late-bind the ES client after plugin startup.
   * Call this with core.elasticsearch.client.asInternalUser
   */
  setElasticsearchClient(client: ElasticsearchClient) {
    this.esClient = client;
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => diag.error(`Failed to flush spans: ${err.message}`));
    }, this.flushIntervalMs);
  }

  onStart(_span: tracing.Span, _parentContext: Context): void {
    // No-op for start - we only care about completed spans
  }

  onEnd(span: tracing.ReadableSpan): void {
    // Only process spans that have gen_ai attributes
    const hasGenAIAttribute = Object.keys(span.attributes).some(
      (key) => key.startsWith('gen_ai.') || key.startsWith('elastic.inference')
    );

    if (!hasGenAIAttribute) {
      return;
    }

    this.pendingSpans.push(span);

    if (this.pendingSpans.length >= this.maxBatchSize) {
      this.flush().catch((err) => diag.error(`Failed to flush spans: ${err.message}`));
    }
  }

  private async flush(): Promise<void> {
    if (!this.esClient || this.pendingSpans.length === 0) {
      return;
    }

    const spansToFlush = this.pendingSpans.splice(0, this.maxBatchSize);

    const operations = spansToFlush.flatMap((span) => [
      { index: { _index: this.indexName } },
      this.spanToDocument(span),
    ]);

    try {
      const response = await this.esClient.bulk({ operations, refresh: false });
      if (response.errors) {
        const errorItems = response.items.filter((item) => item.index?.error);
        diag.error(`Bulk indexing errors: ${JSON.stringify(errorItems.slice(0, 3))}`);
      }
    } catch (error) {
      diag.error(`Failed to index spans: ${error}`);
      // Re-queue failed spans for retry (with limit to avoid memory issues)
      if (this.pendingSpans.length < this.maxBatchSize * 10) {
        this.pendingSpans.unshift(...spansToFlush);
      }
    }
  }

  private hrTimeToISOString(hrTime: [number, number]): string {
    return new Date(hrTime[0] * 1000 + hrTime[1] / 1e6).toISOString();
  }

  private spanToDocument(span: tracing.ReadableSpan): Record<string, unknown> {
    const { traceId, spanId } = span.spanContext();
    const attr = span.attributes;

    return {
      '@timestamp': this.hrTimeToISOString(span.startTime),
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: span.parentSpanContext?.spanId ?? null,
      name: span.name,
      kind: span.kind,
      status: span.status,
      duration_ms:
        (span.endTime[0] - span.startTime[0]) * 1000 +
        (span.endTime[1] - span.startTime[1]) / 1e6,
      attributes: { ...attr },
      resource: { ...span.resource.attributes },
      events: span.events.map((e) => ({
        name: e.name,
        timestamp: this.hrTimeToISOString(e.time),
        attributes: e.attributes,
      })),
      gen_ai: {
        operation_name: attr[GenAISemanticConventions.GenAIOperationName],
        model: attr[GenAISemanticConventions.GenAIRequestModel],
        provider: attr[GenAISemanticConventions.GenAIProviderName],
        input_tokens: attr[GenAISemanticConventions.GenAIUsageInputTokens],
        output_tokens: attr[GenAISemanticConventions.GenAIUsageOutputTokens],
        cost: attr[GenAISemanticConventions.GenAIUsageCost],
      },
    };
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}
