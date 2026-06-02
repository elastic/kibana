/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP OTLP tracing helpers.
 *
 * Thin wrapper over `@kbn/tracing-utils`'s `withActiveSpan` that pins a
 * dedicated `@kbn/evals.aesop` tracer name and forces every span to carry
 * the `instrumentationScope.name` attribute we use across the eval stack.
 * Spans land in the regular `traces-apm-*` data stream via Elastic's OTel
 * SDK; nothing here owns or starts an APM lifecycle.
 *
 * This replaces the old `APMInstrumentationService` class — callers now
 * reach for `withAesopSpan` directly instead of constructing a service,
 * which removes ~200 lines of indirection and aligns AESOP with the same
 * pattern used in `@kbn/evals-runner`.
 */

import { createWithActiveSpan, type WithActiveSpanOptions } from '@kbn/tracing-utils';
import { trace, type Span } from '@opentelemetry/api';

const AESOP_TRACER = trace.getTracer('@kbn/evals.aesop');
const withActiveAesopSpan = createWithActiveSpan({ tracer: AESOP_TRACER });

/**
 * Run `cb` inside an active OTel span named `name`, scoped to the AESOP
 * tracer. Span status (OK / ERROR), exception recording, and span end are
 * all handled by `withActiveSpan`; callers only need to set additional
 * attributes via `opts.attributes` or by mutating `span` inside the
 * callback.
 *
 * The `instrumentationScope.name` attribute is set automatically so the
 * APM UI groups AESOP work consistently with `@kbn/evals` runner spans.
 */
export const withAesopSpan = <T>(
  name: string,
  opts: WithActiveSpanOptions,
  cb: (span?: Span) => Promise<T> | T
): Promise<T> | T => {
  return withActiveAesopSpan(
    name,
    {
      ...opts,
      attributes: {
        'instrumentationScope.name': '@kbn/evals.aesop',
        ...opts.attributes,
      },
    },
    cb
  );
};
