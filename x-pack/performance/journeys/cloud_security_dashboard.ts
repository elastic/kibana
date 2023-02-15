/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/kspm_findings'],
}).step('Go to cloud security dashboards Page', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/security/cloud_security_posture/dashboard`));
  await page.waitForSelector(`[data-test-subj="csp:dashboard-sections-table-header-score"]`);
});
