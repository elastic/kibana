/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tracing } from '@elastic/opentelemetry-node/sdk';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ElasticsearchOtlpExporter } from '@kbn/tracing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { EvalsConfig } from '../config';

type EvaluationEventsExportConfig = Pick<EvalsConfig['onlineEvals'], 'exporters'>;

/**
 * Writes evaluation events to Elasticsearch, where dedup and the online evaluation UI read them,
 * and copies them to any configured OTLP endpoints.
 */
export const createEvaluationEventsProcessors = ({
  exporters,
  esClient,
}: EvaluationEventsExportConfig & { esClient: ElasticsearchClient }): tracing.SpanProcessor[] => [
  new tracing.SimpleSpanProcessor(new ElasticsearchOtlpExporter(esClient)),
  ...exporters.map(
    ({ url, headers }) =>
      new tracing.SimpleSpanProcessor(
        new OTLPTraceExporter({ url, ...(headers ? { headers } : {}) })
      )
  ),
];
