/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';

/**
 * Returns the traceId from the given OTel context.
 */
export const getCurrentTraceId = (ctx: Context): string | undefined => {
  return trace.getSpan(ctx)?.spanContext().traceId;
};
