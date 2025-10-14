/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../..';
import { registerInternalGetList } from './list';
import { registerInternalPatchBulkDisable } from './bulk_disable';
import { registerInternalPostScheduleEndpoint } from './post';

export function registerScheduledReportsRoutesInternal(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  registerInternalGetList({ logger, router, reporting });
  registerInternalPatchBulkDisable({ logger, router, reporting });
  registerInternalPostScheduleEndpoint({ logger, router, reporting });
}
