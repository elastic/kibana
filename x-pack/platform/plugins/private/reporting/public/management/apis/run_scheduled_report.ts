/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';

export const runScheduledReport = async ({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<{ id: string }> => {
  const path = INTERNAL_ROUTES.SCHEDULED.RUN.replace('{id}', encodeURIComponent(id));
  return await http.post(path);
};
