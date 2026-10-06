/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { resources } from '@elastic/opentelemetry-node/sdk';
import type { Tracer } from '@opentelemetry/api';
export declare const initInferenceTracerProvider: ({
  processors,
  resource,
}: {
  processors: tracing.SpanProcessor[];
  resource: resources.Resource;
}) => void;
/** Returns the dedicated inference tracer, falling back to the global one before init. */
export declare const getInferenceTracer: () => Tracer;
export declare const shutdownInferenceTracerProvider: () => Promise<void>;
