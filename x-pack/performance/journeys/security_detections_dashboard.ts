/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/security_dashboard_data'],
})
  .step('Go to Security Users Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/security/detection_response`));
    await page.waitForSelector(subj('severityRuleAlertsPanel'));
  })

  .step('Change time range to 24hr', async ({ page }) => {
    await page.click(subj('superDatePickerShowDatesButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const startDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await startDate.fill('Jan 1, 2020 @ 00:00:00.000');

    await page.click(subj('superDatePickerendDatePopoverButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const endDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await endDate.fill('Jan 1, 2020 @ 23:59:59.999');

    await page.click(subj('querySubmitButton'));
    await page.waitForSelector(subj('severityRuleAlertsPanel'));
  })

  .step('Change time range to 8hr', async ({ page }) => {
    await page.click(subj('superDatePickerstartDatePopoverButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const startDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await startDate.fill('Jan 1, 2020 @ 08:00:00.000');

    await page.click(subj('superDatePickerendDatePopoverButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const endDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await endDate.fill('Jan 1, 2020 @ 15:59:59.999');

    await page.click(subj('querySubmitButton'));
    await page.waitForSelector(subj('severityRuleAlertsPanel'));
  })

  .step('Change time range to 1hr', async ({ page }) => {
    await page.click(subj('superDatePickerstartDatePopoverButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const startDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await startDate.fill('Jan 1, 2020 @ 16:00:00.000');

    await page.click(subj('superDatePickerendDatePopoverButton'));
    await page.click(subj('superDatePickerAbsoluteTab'));
    const endDate = page.locator(subj('superDatePickerAbsoluteDateInput'));
    await endDate.fill('Jan 1, 2020 @ 17:59:59.999');

    await page.click(subj('querySubmitButton'));
    await page.waitForSelector(subj('severityRuleAlertsPanel'));
  });
