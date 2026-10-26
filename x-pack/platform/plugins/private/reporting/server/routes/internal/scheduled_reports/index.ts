/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../..';
import { registerInternalListRoute } from './list';
import { registerInternalBulkDisableRoute } from './bulk_disable';
import { registerInternalCreateScheduledReportRoute } from './create';
import { registerInternalBulkDeleteRoute } from './bulk_delete';
import { registerInternalUpdateScheduledReportRoute } from './update';
import { registerInternalBulkEnableRoute } from './bulk_enable';

export function registerScheduledReportsRoutesInternal(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  registerInternalListRoute({ logger, router, reporting });
  registerInternalBulkDisableRoute({ logger, router, reporting });
  registerInternalCreateScheduledReportRoute({ logger, router, reporting });
  registerInternalBulkDeleteRoute({ logger, router, reporting });
  registerInternalUpdateScheduledReportRoute({ logger, router, reporting });
  registerInternalBulkEnableRoute({ logger, router, reporting });
}
