/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OTTLStatement {
  context: 'log' | 'resource' | 'scope';
  conditions?: string[];
  statements: string[];
}

export interface OTTLTransformProcessor {
  error_mode?: 'ignore' | 'propagate';
  log_statements: OTTLStatement[];
}

export interface OTTLRoutingConnector {
  match_once: boolean;
  default_pipelines: string[];
  table: Array<{
    context: 'log';
    condition: string;
    pipelines: string[];
  }>;
}

export interface OTELConfig {
  receivers: Record<string, any>;
  processors: Record<string, OTTLTransformProcessor | any>;
  connectors: Record<string, OTTLRoutingConnector>;
  exporters: Record<string, any>;
  service: {
    pipelines: Record<
      string,
      {
        receivers: string[];
        processors: string[];
        exporters: string[];
      }
    >;
  };
}

export interface OTTLTranspilationOptions {
  /** Include JSON parsing at root */
  includeJsonParsing?: boolean;
  /** Default receiver (filelog, otlp, etc.) */
  receiver?: string;
  /** Elasticsearch exporter config */
  elasticsearchEndpoint?: string;
  elasticsearchApiKey?: string;
  /** Error handling */
  ignoreUnsupportedProcessors?: boolean;
  /** Debug output */
  includeDebugExporter?: boolean;
}

export interface OTELConfigGeneratorOptions extends OTTLTranspilationOptions {
  /** Receiver configuration */
  receiverType?: 'filelog' | 'otlp';
  filelogInclude?: string[];

  /** Output configuration */
  outputIndex?: string;

  /** Stream filtering */
  includeOnlyStreamsWithProcessing?: boolean;
}
