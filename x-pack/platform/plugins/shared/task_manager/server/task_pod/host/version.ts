/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare const __POD_BUILD_VERSION__: string | undefined;

/**
 * The Kibana version this pod was built from. The build script bakes it in; `POD_KIBANA_VERSION`
 * overrides it. Kibana sends its own version with every run and the pod refuses a mismatch, since
 * task state schemas and saved object migrations are versioned with Kibana.
 */
export const POD_KIBANA_VERSION: string =
  process.env.POD_KIBANA_VERSION ??
  (typeof __POD_BUILD_VERSION__ !== 'undefined' ? __POD_BUILD_VERSION__ : '0.0.0');
