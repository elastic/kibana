/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import { withSpan } from '@kbn/apm-utils';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { RuleStepOutput } from '../types';

/**
 * Middleware that wraps each step execution in an APM span for tracing.
 */
@injectable()
export class ApmMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'apm_span';

  public async execute(
    ctx: RuleExecutionMiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput> {
    return withSpan(
      {
        name: `rule_executor:${ctx.step.name}`,
        type: 'rule_executor',
        labels: { plugin: 'alerting_v2' },
      },
      () => next()
    );
  }
}
