/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/sdk-trace';
import { isInInferenceContext } from './is_in_inference_context';

export function isInferenceSpan(span: Span, parentContext: Context): boolean {
  return (
    (isInInferenceContext(parentContext) || span.instrumentationScope.name === 'inference') &&
    span.instrumentationScope.name !== '@elastic/transport'
  );
}
