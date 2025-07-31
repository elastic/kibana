/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  OTLPExporterNodeConfigBase,
  createOtlpNetworkExportDelegate,
} from '@opentelemetry/otlp-exporter-base';

interface Delegate {
  _serializer: Parameters<typeof createOtlpNetworkExportDelegate>[1];
}

/**
 * This exporter exists because Phoenix /v1/traces responds with JSON
 * which is not spec-compliant. It will cause a warning to be logged.
 */
export class PhoenixProtoExporter extends OTLPTraceExporter {
  constructor(config?: OTLPExporterNodeConfigBase) {
    super(config);
    const serializer = (this as unknown as { _delegate: Delegate })._delegate._serializer;

    const originalDeserializeResponse = serializer.deserializeResponse.bind(serializer);

    serializer.deserializeResponse = (data) => {
      if (data.toString() === '"{}"') {
        return undefined;
      }

      return originalDeserializeResponse(data);
    };
  }
}
