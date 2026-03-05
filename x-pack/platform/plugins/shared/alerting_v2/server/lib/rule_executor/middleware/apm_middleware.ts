/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { getDefaultTracer } from '@kbn/default-tracer';
import { injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream } from '../types';
import { APP_ID } from '../../constants';

/**
 * Middleware that wraps each step's stream processing in an OpenTelemetry span for tracing.
 *
 * The span stays open for the entire duration of the step's stream,
 * capturing both success and failure outcomes.
 */
@injectable()
export class ApmMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'apm_span';

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const tracer = getDefaultTracer();

    return (async function* () {
      const span = tracer?.startSpan(`rule_executor:${ctx.step.name}`, {
        attributes: { plugin: APP_ID },
      });

      try {
        for await (const result of stream) {
          yield result;
        }

        if (span?.isRecording()) {
          span.setStatus({ code: SpanStatusCode.OK });
        }
      } catch (error) {
        if (span?.isRecording()) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
        }

        throw error;
      } finally {
        span?.end();
      }
    })();
  }
}
