/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local Scout matrix for Search Inference UI + API tests (Feature Settings, EIS, model flyout, inference settings API).
 *
 * `@local-stateful-search` is intentionally omitted: Kibana CI only schedules stateful test runs
 * tagged `classic`.
 */
export const INFERENCE_LOCAL_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-search',
] as const;
