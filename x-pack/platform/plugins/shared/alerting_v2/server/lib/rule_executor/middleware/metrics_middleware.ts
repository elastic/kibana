/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream, StepAnnotations } from '../types';
import type { RuleExecutionMetricsCollectorContract } from '../metrics_collector';

/**
 * Middleware that reads step annotations from yielded results and records
 * them on the per-run metrics collector. This decouples steps from the
 * collector — steps declare what happened via annotations, and this
 * middleware translates those into collector calls.
 */
@injectable()
export class MetricsMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'metrics';

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const { metrics } = ctx;

    if (!metrics) {
      return stream;
    }

    return (async function* () {
      for await (const result of stream) {
        if (result.type === 'continue' && result.annotations) {
          recordAnnotations(metrics, result.annotations);
        }
        yield result;
      }
    })();
  }
}

function recordAnnotations(
  metrics: RuleExecutionMetricsCollectorContract,
  annotations: StepAnnotations
): void {
  if (annotations.querySearches) {
    for (const sample of annotations.querySearches) {
      metrics.recordQuerySearch(sample);
    }
  }
  if (annotations.eventsWritten) {
    metrics.recordEventsWritten(annotations.eventsWritten);
  }
  if (annotations.episodesTransitioned) {
    metrics.recordEpisodesTransitioned(annotations.episodesTransitioned);
  }
  if (annotations.recovery) {
    metrics.recordRecovery(annotations.recovery);
  }
}
