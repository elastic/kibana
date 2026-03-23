/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context } from '@opentelemetry/api';
import { createInferenceContext } from './create_inference_context';

/**
 * Creates an active "inference"-scoped context. Every span created in this
 * context will be exported via the inference exporters. This allows us to export
 * a subset of spans to external systems like Phoenix.
 */
export const withInferenceContext = <T>(fn: () => T): T => {
  const { context: parentContext } = createInferenceContext();

  return context.with(parentContext, fn);
};
