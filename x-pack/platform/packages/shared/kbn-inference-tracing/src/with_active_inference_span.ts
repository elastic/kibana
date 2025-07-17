/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { core } from '@elastic/opentelemetry-node/sdk';
import { createWithActiveSpan, withActiveSpan } from '@kbn/tracing-utils';
import { propagation, trace } from '@opentelemetry/api';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';
import { IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME } from './root_inference_span';

/**
 * Creates an active "inference"-scoped span, that is, every span created in this
 * context will be exported via the inference exporters. This allows us to export
 * a subset of spans to external systems like Phoenix.
 */
export const withActiveInferenceSpan = createWithActiveSpan(
  {
    tracer: trace.getTracer('inference'),
  },
  (name, opts, ctx, cb) => {
    if (core.isTracingSuppressed(ctx)) {
      return cb();
    }

    let baggage = propagation.getBaggage(ctx);

    let isRootInferenceSpan = false;

    // If the tracking beacon isn't found in the baggage for
    // the current context, this is the root span for the inference context
    if (!baggage) {
      baggage = propagation.createBaggage({
        [BAGGAGE_TRACKING_BEACON_KEY]: {
          value: BAGGAGE_TRACKING_BEACON_VALUE,
        },
      });
      isRootInferenceSpan = true;
    } else if (
      baggage.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value !== BAGGAGE_TRACKING_BEACON_VALUE
    ) {
      isRootInferenceSpan = true;
      baggage = baggage.setEntry(BAGGAGE_TRACKING_BEACON_KEY, {
        value: BAGGAGE_TRACKING_BEACON_VALUE,
      });
    }

    // create a new context with the updated baggage
    const parentContext = propagation.setBaggage(ctx, baggage);

    return withActiveSpan(
      name,
      {
        ...opts,
        attributes: {
          ...opts.attributes,
          [IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME]: isRootInferenceSpan,
        },
      },
      parentContext,
      (span) => {
        return cb(span);
      }
    );
  }
);
