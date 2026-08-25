/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingLangfuseExportConfig } from '@kbn/inference-tracing-config';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { memoize } from 'lodash';
import { diag } from '@opentelemetry/api';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
import { parseJsonAttr } from '../util/parse_json_attr';
import { isTextPart, isToolCallPart } from '../util/message_parts';
import type { GenAIInputMessage, GenAIOutputMessage, GenAITextPart } from '../types';
import { GenAISemanticConventions } from '../types';

export class LangfuseSpanProcessor extends BaseInferenceSpanProcessor {
  private getProjectId: () => Promise<string | undefined>;
  constructor(private readonly config: InferenceTracingLangfuseExportConfig) {
    const headers = {
      Authorization: `Basic ${Buffer.from(`${config.public_key}:${config.secret_key}`).toString(
        'base64'
      )}`,
    };

    const exporter = new OTLPTraceExporter({
      url: `${config.base_url}/api/public/otel/v1/traces`,
      headers,
    });

    super(exporter, config.scheduled_delay);

    const getProjectIdMemoized = memoize(async () => {
      const base = new URL(config.base_url);

      const { data } = await fetch(new URL('/api/public/projects', base), { headers }).then(
        (response) => response.json() as Promise<{ data: Array<{ id: string; name: string }> }>
      );

      return data?.[0]?.id;
    });

    this.getProjectId = () => {
      return getProjectIdMemoized().catch((error) => {
        diag.error(`Could not get project ID from Langfuse: ${error.message}`);
        getProjectIdMemoized.cache.clear?.();
        return undefined;
      });
    };
  }

  override processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan {
    if (span.attributes['gen_ai.operation.name'] === 'chat') {
      const inputMessages = parseJsonAttr<GenAIInputMessage[]>(
        span.attributes[GenAISemanticConventions.GenAIInputMessages]
      );
      const outputMessages = parseJsonAttr<GenAIOutputMessage[]>(
        span.attributes[GenAISemanticConventions.GenAIOutputMessages]
      );
      const systemInstructions = parseJsonAttr<GenAITextPart[]>(
        span.attributes[GenAISemanticConventions.GenAISystemInstructions]
      );

      const inputForDisplay: Array<Record<string, string>> = [];

      if (systemInstructions) {
        inputForDisplay.push({
          role: 'system',
          content: systemInstructions.map((p) => p.content).join('\n'),
        });
      }

      if (inputMessages) {
        for (const msg of inputMessages) {
          const textContent = msg.parts
            .filter(isTextPart)
            .map((p) => p.content)
            .join('\n');
          inputForDisplay.push({
            role: msg.role,
            content: textContent || JSON.stringify(msg.parts),
          });
        }
      }

      span.attributes['input.value'] = JSON.stringify(inputForDisplay);

      if (outputMessages?.length) {
        const firstOutput = outputMessages[0];
        const textContent = firstOutput.parts
          .filter(isTextPart)
          .map((p) => p.content)
          .join('');
        const toolCalls = firstOutput.parts.filter(isToolCallPart);

        span.attributes['output.value'] = JSON.stringify({
          content: textContent || null,
          role: 'assistant',
          ...(toolCalls.length
            ? {
                tool_calls: toolCalls.map((tc) => ({
                  function: { name: tc.name, arguments: tc.arguments },
                  id: tc.id,
                  type: 'function',
                })),
              }
            : {}),
        });
      }
    }

    if (span.attributes['gen_ai.operation.name'] === 'execute_tool') {
      const toolResult = span.attributes['gen_ai.tool.call.result'];
      if (toolResult) {
        span.attributes['output.value'] = String(toolResult);
      }
      const toolArgs = span.attributes['gen_ai.tool.call.arguments'];
      if (toolArgs) {
        span.attributes['input.value'] = String(toolArgs);
      }
    }

    if (!span.parentSpanContext) {
      const traceId = span.spanContext().traceId;
      void this.getProjectId().then((projectId) => {
        // this is how Langfuse generates IDs, see
        // https://github.com/langfuse/langfuse/blob/2d4708921c67bca61c774633b7df65b3c5105f0d/web/src/features/otel/server/index.ts#L506
        const langfuseTraceId = Buffer.from(traceId).toString('hex');
        const url = new URL(
          `/project/${projectId}/traces/${langfuseTraceId}`,
          new URL(this.config.base_url)
        );
        diag.info(`View trace at ${url.toString()}`);
      });
    }

    return span;
  }
}
