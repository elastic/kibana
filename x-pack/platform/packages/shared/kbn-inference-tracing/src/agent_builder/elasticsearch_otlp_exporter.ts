/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { core } from '@elastic/opentelemetry-node/sdk';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';

const ES_OTLP_TRACES_PATH = '/_otlp/v1/traces';
const CONTENT_TYPE_PROTOBUF = 'application/x-protobuf';

/**
 * Minimal contract for the Elasticsearch client transport.
 * Keeps this module decoupled from `@kbn/core` so any client
 * that exposes `transport.request()` works.
 */
export interface ElasticsearchTransport {
  transport: {
    request: (
      params: { method: string; path: string; body: Buffer },
      options?: { headers?: Record<string, string>; maxRetries?: number }
    ) => Promise<unknown>;
  };
}

/**
 * A {@link tracing.SpanExporter} that ships OTLP-protobuf encoded spans
 * to Elasticsearch's native `/_otlp/v1/traces` endpoint via the
 * ES client transport. This reuses the same connection, auth, and TLS
 * settings that Kibana already has for talking to Elasticsearch.
 */
export class ElasticsearchOtlpExporter implements tracing.SpanExporter {
  constructor(private readonly client: ElasticsearchTransport) {}

  export(spans: tracing.ReadableSpan[], resultCallback: (result: core.ExportResult) => void): void {
    const serialized = ProtobufTraceSerializer.serializeRequest(spans);
    if (!serialized) {
      resultCallback({
        code: core.ExportResultCode.FAILED,
        error: new Error('Serialization failed'),
      });
      return;
    }

    this.client.transport
      .request(
        {
          method: 'POST',
          path: ES_OTLP_TRACES_PATH,
          body: Buffer.from(serialized),
        },
        {
          headers: { 'Content-Type': CONTENT_TYPE_PROTOBUF },
          maxRetries: 0,
        }
      )
      .then(() => resultCallback({ code: core.ExportResultCode.SUCCESS }))
      .catch((error) => resultCallback({ code: core.ExportResultCode.FAILED, error }));
  }

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}
