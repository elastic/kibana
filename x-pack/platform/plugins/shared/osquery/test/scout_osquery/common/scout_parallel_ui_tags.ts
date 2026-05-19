/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

/**
 * Default Playwright `tag` array for Osquery **parallel** UI specs that must run on:
 * - **Stateful classic** — includes both `@local-stateful-classic` and `@cloud-stateful-classic`
 *   (see `getPlaywrightTagsFor('stateful', 'classic', 'all')` in `@kbn/scout`).
 * - **Serverless security_complete** — includes local mock-serverless **and** cloud MKI tags
 *   for that project type.
 *
 * Do **not** name variables holding this array `localTags`: it is not local-only execution.
 */
export const OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.security.complete,
];
