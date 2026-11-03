/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInvalidate as runPackageInvalidate } from '@kbn/response-ops-api-keys';

/** Kept until alerting and alerting v2 call `@kbn/response-ops-api-keys` directly. */
export const runInvalidate = (
  opts: Omit<Parameters<typeof runPackageInvalidate>[0], 'pluginTag'>
): ReturnType<typeof runPackageInvalidate> =>
  runPackageInvalidate({ ...opts, pluginTag: 'task-manager' });
