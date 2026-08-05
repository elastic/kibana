/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const ROLLUP_JOBS_PATH = 'management/data/rollup_jobs';

export class RollupPage {
  readonly deprecationPrompt: Locator;
  readonly jobsListTable: Locator;
  readonly detailsFlyoutTitle: Locator;
  readonly closeFlyoutButton: Locator;
  readonly nextButton: Locator;
  readonly saveButton: Locator;
  readonly indexPatternSuccess: Locator;

  constructor(private readonly page: ScoutPage) {
    this.deprecationPrompt = page.testSubj.locator('jobListDeprecatedPrompt');
    this.jobsListTable = page.testSubj.locator('rollupJobsListTable');
    this.detailsFlyoutTitle = page.testSubj.locator('rollupJobDetailsFlyoutTitle');
    this.closeFlyoutButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.nextButton = page.testSubj.locator('rollupJobNextButton');
    this.saveButton = page.testSubj.locator('rollupJobSaveButton');
    this.indexPatternSuccess = page.testSubj.locator('fieldIndexPatternSuccessMessage');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(ROLLUP_JOBS_PATH);
  }

  // The wizard renders `createRollupStep${n}--active` for the active step.
  stepActive(step: number): Locator {
    return this.page.testSubj.locator(`createRollupStep${step}--active`);
  }

  // Match the single job-list row by its exact name so assertions stay correct when other rollup
  // jobs are present on the shared cluster.
  jobRow(name: string): Locator {
    return this.jobsListTable
      .locator('[data-test-subj="jobTableRow"]')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async startCreate(): Promise<void> {
    // The empty-state create button is gone now that rollups are deprecated; the create wizard is
    // still reachable by navigating straight to its route (as the FTR functional suite does).
    await this.page.gotoApp(`${ROLLUP_JOBS_PATH}/create`);
    await this.stepActive(1).waitFor({ state: 'visible' });
  }

  // Step 1 (logistics): name, index pattern, target index, an advanced-cron schedule, and delay.
  async fillLogistics(params: {
    name: string;
    indexPattern: string;
    indexName: string;
    cron: string;
    delay: string;
  }): Promise<void> {
    await this.page.testSubj.locator('rollupJobName').fill(params.name);
    await this.page.testSubj.locator('rollupIndexPattern').fill(params.indexPattern);
    await this.indexPatternSuccess.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('rollupIndexName').fill(params.indexName);
    await this.page.testSubj.locator('rollupShowAdvancedCronLink').click();
    await this.page.testSubj.locator('rollupAdvancedCron').fill(params.cron);
    await this.page.testSubj.locator('rollupDelay').fill(params.delay);
  }

  // Step 2 (date histogram): the rollup interval.
  async setInterval(interval: string): Promise<void> {
    await this.page.testSubj.locator('rollupJobInterval').fill(interval);
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.detailsFlyoutTitle.waitFor({ state: 'visible' });
  }

  async closeFlyout(): Promise<void> {
    await this.closeFlyoutButton.click();
    await this.jobsListTable.waitFor({ state: 'visible' });
  }
}
