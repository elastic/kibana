/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tracing } from '@elastic/opentelemetry-node/sdk';
import { InferenceTracingPhoenixExportConfig } from '@kbn/inference-tracing-config';
import { memoize } from 'lodash';
import {
  SEMRESATTRS_PROJECT_NAME,
  SemanticConventions,
} from '@arizeai/openinference-semantic-conventions';
import { diag } from '@opentelemetry/api';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
import { ElasticGenAIAttributes, GenAISemanticConventions } from '../types';
import { getChatSpan } from './get_chat_span';
import { getExecuteToolSpan } from './get_execute_tool_span';
import { PhoenixProtoExporter } from './phoenix_otlp_exporter';

export class PhoenixSpanProcessor extends BaseInferenceSpanProcessor {
  private getProjectId: () => Promise<string | undefined>;
  constructor(private readonly config: InferenceTracingPhoenixExportConfig) {
    const headers = {
      ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
    };

    const exporter = new PhoenixProtoExporter({
      headers,
      url: `${config.base_url}/v1/traces`,
    });

    super(exporter, config.scheduled_delay);

    const getProjectIdMemoized = memoize(async () => {
      if (!config.public_url) {
        return undefined;
      }

      const base = new URL(config.public_url);

      const { data } = await fetch(new URL('/v1/projects', base), { headers }).then(
        (response) =>
          response.json() as Promise<{
            data: Array<{ id: string; name: string; description: string }>;
          }>
      );

      return config.project_name
        ? data.find((item) => item.name === config.project_name)?.id
        : data[0]?.id;
    });

    this.getProjectId = () => {
      return getProjectIdMemoized().catch((error) => {
        diag.error(`Could not get project ID from Phoenix: ${error.message}`);
        getProjectIdMemoized.cache.clear?.();
        return undefined;
      });
    };
  }

  processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan {
    const operationName = span.attributes[GenAISemanticConventions.GenAIOperationName];
    span.resource.attributes[SEMRESATTRS_PROJECT_NAME] = this.config.project_name ?? 'default';
    span.attributes[SemanticConventions.OPENINFERENCE_SPAN_KIND] =
      span.attributes[ElasticGenAIAttributes.InferenceSpanKind];

    if (operationName === 'chat') {
      span = getChatSpan(span);
    } else if (operationName === 'execute_tool') {
      span = getExecuteToolSpan(span);
    }

    if (!span.parentSpanContext) {
      const traceId = span.spanContext().traceId;
      void this.getProjectId().then((projectId) => {
        if (!projectId || !this.config.public_url) {
          return;
        }

        const url = new URL(
          `/projects/${projectId}/traces/${traceId}?selected`,
          new URL(this.config.public_url)
        );
        diag.info(`View trace at ${url.toString()}`);
      });
    }
    return span;
  }
}
