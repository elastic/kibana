/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { core } from '@elastic/opentelemetry-node/sdk';
import { createWithActiveSpan, withActiveSpan } from '@kbn/tracing-utils';
import { propagation, trace } from '@opentelemetry/api';
import { createInferenceContext } from './create_inference_context';
import { EVAL_RUN_ID_BAGGAGE_KEY } from './baggage';
import { IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME } from './root_inference_span';

/**
 * Creates an active "inference"-scoped span, that is, every span created in this
 * context will be exported via the inference exporters. This allows us to export
 * a subset of spans to external systems like Phoenix.
 */

const TRACER = trace.getTracer('inference');

export const withActiveInferenceSpan = createWithActiveSpan(
  {
    tracer: TRACER,
  },
  (name, opts, ctx, cb) => {
    if (core.isTracingSuppressed(ctx)) {
      return cb();
    }

    const { context: parentContext, isRoot } = createInferenceContext();
    const evalRunId = propagation
      .getBaggage(parentContext)
      ?.getEntry(EVAL_RUN_ID_BAGGAGE_KEY)?.value;

    return withActiveSpan(
      name,
      {
        ...opts,
        attributes: {
          ...opts.attributes,
          [IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME]: isRoot,
          ...(evalRunId ? { [EVAL_RUN_ID_BAGGAGE_KEY]: evalRunId } : {}),
        },
      },
      parentContext,
      (span) => {
        return cb(span);
      }
    );
  }
);
