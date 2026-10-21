/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace } from '@opentelemetry/api';
import type { CodecInput } from './codecs';

const current = (): string | null => trace.getActiveSpan()?.spanContext().traceId ?? null;

/** Reads the active trace id across two continuations. A sync read would hide a dropped context. */
export const readParentSpan = async (): Promise<CodecInput> => {
  await new Promise((resolve) => setImmediate(resolve));
  const before = current();
  await new Promise((resolve) => setTimeout(resolve, 40));
  const after = current();
  return { before, after };
};
