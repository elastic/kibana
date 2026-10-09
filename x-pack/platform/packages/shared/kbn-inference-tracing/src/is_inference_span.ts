/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { isInInferenceContext } from './is_in_inference_context';

export function isInferenceSpan(span: tracing.Span, parentContext: api.Context): boolean {
  return (
    (isInInferenceContext(parentContext) || span.instrumentationScope.name === 'inference') &&
    span.instrumentationScope.name !== '@elastic/transport'
  );
}
