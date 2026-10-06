/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates an active "inference"-scoped span, that is, every span created in this
 * context will be exported via the inference exporters. This allows us to export
 * a subset of spans to external systems like Phoenix.
 */
export declare const withActiveInferenceSpan: import('@kbn/tracing-utils/src/with_active_span').WithActiveSpan;
