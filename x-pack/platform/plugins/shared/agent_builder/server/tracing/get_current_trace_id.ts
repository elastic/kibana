/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace } from '@opentelemetry/api';

/**
 * Returns the current traceId (which can be used to check traces in phoenix.
 *
 * **MUST* be called from within an active trace
 */
export const getCurrentTraceId = (): string | undefined => {
  return trace.getActiveSpan()?.spanContext().traceId;
};
