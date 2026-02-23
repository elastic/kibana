/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingElasticsearchExportConfig } from '@kbn/inference-tracing-config';
import { diag } from '@opentelemetry/api';
import { GenAISemanticConventions } from '../types';
import { unflattenAttributes } from '../util/unflatten_attributes';

// OpenTelemetry HRTime is [seconds, nanoseconds]
type HrTime = [number, number];

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const MILLISECONDS_PER_SECOND = 1_000;

/**
 * Converts OpenTelemetry HRTime to milliseconds
 */
function hrTimeToMilliseconds(hrTime: HrTime): number {
  return hrTime[0] * MILLISECONDS_PER_SECOND + hrTime[1] / NANOSECONDS_PER_MILLISECOND;
}

/**
 * Export result codes matching OpenTelemetry conventions
 */
enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1,
}

interface ExportResult {
  code: ExportResultCode;
  error?: Error;
}

interface ElasticsearchTraceDocument {
  '@timestamp': string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: string;
  status: {
    code: number;
    message?: string;
  };
  start_time: string;
  end_time: string;
  duration_ms: number;
  attributes: Record<string, unknown>;
  resource: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: string;
    attributes?: Record<string, unknown>;
  }>;
  links: Array<{
    trace_id: string;
    span_id: string;
    attributes?: Record<string, unknown>;
  }>;
  gen_ai?: {
    operation_name?: string;
    request_model?: string;
    response_model?: string;
    system?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cached_input_tokens?: number;
      cost?: number;
    };
  };
}

/**
 * Custom SpanExporter that sends traces directly to Elasticsearch.
 * Implements the tracing.SpanExporter interface from @elastic/opentelemetry-node/sdk.
 */
export class ElasticsearchExporter implements tracing.SpanExporter {
  private pendingExports: Promise<void>[] = [];

  constructor(private readonly config: InferenceTracingElasticsearchExportConfig) {}

  export(spans: tracing.ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const exportPromise = this.doExport(spans)
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((error) => {
        diag.error(`Failed to export spans to Elasticsearch: ${error.message}`);
        resultCallback({ code: ExportResultCode.FAILED, error });
      });

    this.pendingExports.push(exportPromise);
  }

  private async doExport(spans: tracing.ReadableSpan[]): Promise<void> {
    if (spans.length === 0) {
      return;
    }

    const indexName = this.config.index_name ?? 'inference-traces';
    const documents = spans.map((span) => this.spanToDocument(span));

    // Build bulk request body
    const bulkBody = documents.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-ndjson',
    };

    if (this.config.api_key) {
      headers.Authorization = `ApiKey ${this.config.api_key}`;
    } else if (this.config.username && this.config.password) {
      headers.Authorization = `Basic ${Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64')}`;
    }

    const response = await fetch(`${this.config.cluster_url}/_bulk`, {
      method: 'POST',
      headers,
      body: bulkBody.map((line) => JSON.stringify(line)).join('\n') + '\n',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Elasticsearch bulk request failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as {
      errors?: boolean;
      items?: Array<{ index?: { error?: unknown } }>;
    };
    if (result.errors) {
      const failedItems = result.items?.filter((item) => item.index?.error) ?? [];
      diag.warn(`Some spans failed to index to Elasticsearch: ${failedItems.length} failures`);
    }
  }

  private spanToDocument(span: tracing.ReadableSpan): ElasticsearchTraceDocument {
    const startTimeMs = hrTimeToMilliseconds(span.startTime);
    const endTimeMs = hrTimeToMilliseconds(span.endTime);
    const durationMs = endTimeMs - startTimeMs;

    const attributes = unflattenAttributes(span.attributes);
    const resourceAttributes = unflattenAttributes(span.resource.attributes);

    const doc: ElasticsearchTraceDocument = {
      '@timestamp': new Date(startTimeMs).toISOString(),
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      parent_span_id: span.parentSpanContext?.spanId,
      name: span.name,
      kind: this.getSpanKindString(span.kind),
      status: {
        code: span.status.code,
        message: span.status.message,
      },
      start_time: new Date(startTimeMs).toISOString(),
      end_time: new Date(endTimeMs).toISOString(),
      duration_ms: durationMs,
      attributes,
      resource: resourceAttributes,
      events: span.events.map((event) => ({
        name: event.name,
        timestamp: new Date(hrTimeToMilliseconds(event.time)).toISOString(),
        attributes: event.attributes ? unflattenAttributes(event.attributes) : undefined,
      })),
      links: span.links.map((link) => ({
        trace_id: link.context.traceId,
        span_id: link.context.spanId,
        attributes: link.attributes ? unflattenAttributes(link.attributes) : undefined,
      })),
    };

    // Extract GenAI-specific attributes for easier querying
    const genAiAttrs = span.attributes;
    if (genAiAttrs[GenAISemanticConventions.GenAIOperationName]) {
      doc.gen_ai = {
        operation_name: genAiAttrs[GenAISemanticConventions.GenAIOperationName] as
          | string
          | undefined,
        request_model: genAiAttrs[GenAISemanticConventions.GenAIRequestModel] as string | undefined,
        response_model: genAiAttrs[GenAISemanticConventions.GenAIResponseModel] as
          | string
          | undefined,
        system: genAiAttrs[GenAISemanticConventions.GenAISystem] as string | undefined,
        usage: {
          input_tokens: genAiAttrs[GenAISemanticConventions.GenAIUsageInputTokens] as
            | number
            | undefined,
          output_tokens: genAiAttrs[GenAISemanticConventions.GenAIUsageOutputTokens] as
            | number
            | undefined,
          cached_input_tokens: genAiAttrs[GenAISemanticConventions.GenAIUsageCachedInputTokens] as
            | number
            | undefined,
          cost: genAiAttrs[GenAISemanticConventions.GenAIUsageCost] as number | undefined,
        },
      };
    }

    return doc;
  }

  private getSpanKindString(kind: number): string {
    const kindMap: Record<number, string> = {
      0: 'INTERNAL',
      1: 'SERVER',
      2: 'CLIENT',
      3: 'PRODUCER',
      4: 'CONSUMER',
    };
    return kindMap[kind] ?? 'UNKNOWN';
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.pendingExports);
    this.pendingExports = [];
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this.pendingExports);
    this.pendingExports = [];
  }
}
