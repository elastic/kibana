/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingPhoenixExportConfig } from '@kbn/inference-tracing-config';
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

/**
 * Ensure the base URL is treated as a directory (trailing '/'),
 * so that relative paths are resolved under any existing path prefix (e.g. '/phoenix/').
 */
function getDirectoryBaseUrl(url: URL): URL {
  if (!url.pathname.endsWith('/')) {
    const clone = new URL(url);
    clone.pathname = `${clone.pathname}/`;
    return clone;
  }
  return url;
}

/**
 * Resolve a path (may start with '/') within the base URL's pathname,
 * preserving the base URL's path prefix. Supports optional query string.
 */
function resolvePathWithinBasePrefix(base: URL, path: string): URL {
  const [pathPart, searchPart] = path.split('?');
  const relative = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart;
  const result = new URL(base.origin);
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  result.pathname = `${basePath}${relative}`;
  if (searchPart) {
    result.search = `?${searchPart}`;
  }
  return result;
}

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

      const base = getDirectoryBaseUrl(new URL(config.public_url));

      const { data } = await fetch(resolvePathWithinBasePrefix(base, '/v1/projects'), {
        headers,
      }).then(
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

        const publicBase = getDirectoryBaseUrl(new URL(this.config.public_url));
        const url = resolvePathWithinBasePrefix(
          publicBase,
          `/projects/${projectId}/traces/${traceId}?selected`
        );
        diag.info(`View trace at ${url.toString()}`);
      });
    }
    return span;
  }
}
