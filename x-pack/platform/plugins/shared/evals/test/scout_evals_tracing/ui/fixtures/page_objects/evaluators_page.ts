/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

export class EvaluatorsPage {
  readonly table: Locator;
  readonly createButton: Locator;
  readonly search: Locator;
  readonly kindFilter: Locator;
  readonly originFilter: Locator;
  readonly saveButton: Locator;
  readonly testResult: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.table = page.testSubj.locator('evalsEvaluatorsTable');
    this.createButton = page.testSubj.locator('evalsEvaluatorCreate');
    this.search = page.testSubj.locator('evalsEvaluatorSearch');
    this.kindFilter = page.testSubj.locator('evalsEvaluatorKindFilter');
    this.originFilter = page.testSubj.locator('evalsEvaluatorOriginFilter');
    this.saveButton = page.testSubj.locator('evalsEvaluatorSave');
    this.testResult = page.testSubj.locator('evalsEvaluatorTestResult');
  }

  row(name: string): Locator {
    return this.table
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  async goto(spaceId?: string): Promise<void> {
    if (spaceId) {
      await this.page.goto(this.kbnUrl.app('management/ai/evals/evaluators', { space: spaceId }));
    } else {
      await this.page.gotoApp('management/ai/evals/evaluators');
    }
    await this.table.waitFor({ state: 'visible' });
  }

  async openCreate(): Promise<void> {
    await this.createButton.click();
    await this.page.testSubj.locator('evalsEvaluatorName').waitFor({ state: 'visible' });
  }

  async fillRequiredFields(name: string, description: string): Promise<void> {
    await this.page.testSubj.locator('evalsEvaluatorName').fill(name);
    await this.page.testSubj.locator('evalsEvaluatorDescription').fill(description);
    await this.page.testSubj.locator('evalsEvaluatorSystemPrompt').fill('Judge response quality.');
    await this.page.testSubj.locator('evalsEvaluatorPrompt').fill('Rate {{{agent_response}}}');
    await this.page.testSubj.locator('evalsEvaluatorScoreName-0').fill('quality');
  }

  async editUserDefinedEvaluator(name: string, description: string): Promise<void> {
    await this.row(name).getByTestId('evalsEvaluatorEdit').click();
    await this.page.testSubj.locator('evalsEvaluatorDescription').fill(description);
    await this.saveButton.click();
  }

  async deleteUserDefinedEvaluator(name: string): Promise<void> {
    await this.row(name).getByTestId('evalsEvaluatorDelete').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async runTest(): Promise<void> {
    await this.page.components
      .comboBox('evalsEvaluatorConnector')
      .setSelectedOptions(['Test connector']);
    await this.page.testSubj
      .locator('evalsEvaluatorTraceId')
      .fill('0af7651916cd43dd8448eb211c80319c');
    await this.page.testSubj.locator('evalsEvaluatorRunTest').click();
    await this.testResult.waitFor({ state: 'visible' });
  }
}
