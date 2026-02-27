/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
import { injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream } from '../types';
import { APP_ID } from '../../constants';

/**
 * Middleware that wraps each step's stream processing in an APM span for tracing.
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

    return (async function* () {
      const span = agent.startSpan(`rule_executor:${ctx.step.name}`, 'rule_executor') ?? undefined;
      span?.addLabels({ plugin: APP_ID });

      try {
        for await (const result of stream) {
          yield result;
        }

        if (span) {
          span.outcome = 'success';
        }
      } catch (error) {
        if (span) {
          span.outcome = 'failure';
        }

        throw error;
      } finally {
        span?.end();
      }
    })();
  }
}
