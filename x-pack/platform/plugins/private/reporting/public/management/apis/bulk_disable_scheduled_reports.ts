/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';

export const bulkDisableScheduledReports = async ({
  http,
  ids = [],
}: {
  http: HttpSetup;
  ids: string[];
}): Promise<{
  scheduled_report_ids: string[];
  errors: Array<{ message: string; status?: number; id: string }>;
  total: number;
}> => {
  return await http.patch(INTERNAL_ROUTES.SCHEDULED.BULK_DISABLE, {
    body: JSON.stringify({ ids }),
  });
};
