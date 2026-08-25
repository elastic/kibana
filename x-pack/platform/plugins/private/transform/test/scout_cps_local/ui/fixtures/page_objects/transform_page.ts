/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class TransformPage {
  public readonly createPage: Locator;
  public readonly listContainer: Locator;
  public readonly listTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createPage = this.page.testSubj.locator('transformPageCreateTransform');
    this.listContainer = this.page.testSubj.locator('transformListTableContainer');
    this.listTable = this.page.testSubj.locator('transformListTable');
  }

  async gotoManagement(): Promise<void> {
    await this.page.gotoApp('management/data/transform');
    await this.listContainer.waitFor({ state: 'visible' });
  }

  async gotoCreate(dataViewId: string): Promise<void> {
    await this.page.gotoApp(`management/data/transform/create_transform/${dataViewId}`);
    await this.createPage.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('transformStepDefineForm').waitFor({ state: 'visible' });
  }

  getTransformRow(transformId: string): Locator {
    return this.page
      .locator('[data-test-subj~="transformListRow"]')
      .filter({ hasText: transformId });
  }

  async selectOnlyProject(projectId: string, projectIds: string[]): Promise<void> {
    for (const visibleProjectId of projectIds) {
      await this.setProjectIncluded(visibleProjectId, visibleProjectId === projectId);
    }
  }

  async selectCreateProjectScope(projectId: string, projectIds: string[]): Promise<void> {
    await this.page.testSubj.locator('transformProjectScopePicker').click();
    await this.selectOnlyProject(projectId, projectIds);
    await this.page.keyboard.press('Escape');
  }

  async selectEditProjectScope(projectId: string, projectIds: string[]): Promise<void> {
    await this.page.testSubj.locator('transformEditProjectScopeButton').click();
    await this.page.testSubj
      .locator('projectPickerFlyoutApplyButton')
      .waitFor({ state: 'visible' });
    await this.selectOnlyProject(projectId, projectIds);
    await this.page.testSubj.locator('projectPickerFlyoutApplyButton').click();
  }

  async selectTransformRows(transformIds: string[]): Promise<void> {
    for (const transformId of transformIds) {
      await this.getTransformRow(transformId).getByRole('checkbox').click();
    }
    await this.page.testSubj.locator('transformBulkActionsMenuButton').waitFor({
      state: 'visible',
    });
  }

  async openBulkProjectScopeFlyout(): Promise<void> {
    await this.page.testSubj.locator('transformBulkActionsMenuButton').click();
    await this.page.getByRole('button', { name: 'Change project scope' }).click();
    await this.page.testSubj
      .locator('projectPickerFlyoutApplyButton')
      .waitFor({ state: 'visible' });
  }

  async selectBulkProjectScope(projectId: string, projectIds: string[]): Promise<void> {
    await this.selectOnlyProject(projectId, projectIds);
    await this.page.testSubj.locator('projectPickerFlyoutApplyButton').click();
    await this.page.testSubj.locator('transformBulkProjectScopeModal').waitFor({
      state: 'visible',
    });
  }

  async confirmBulkProjectScopeUpdate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Yes, save' }).click();
    await this.page.testSubj.locator('transformBulkProjectScopeModal').waitFor({
      state: 'hidden',
    });
  }

  async configureBasicPivot(): Promise<void> {
    await this.selectDropDownOption('transformGroupBySelection', 'terms(airline)');
    await this.page.testSubj.locator('transformGroupByEntry 0').waitFor({ state: 'visible' });
    await this.selectDropDownOption('transformAggregationSelection', 'avg(responsetime)');
    await this.page.testSubj.locator('transformAggregationEntry_0').waitFor({ state: 'visible' });
  }

  async useFullData(): Promise<void> {
    await this.page.getByRole('button', { name: 'Use full data' }).click();
  }

  async createTransform(transformId: string): Promise<void> {
    await this.page.testSubj.locator('transformWizardNavButtonNext').click();
    await this.page.testSubj.locator('transformStepDetailsForm').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('transformIdInput').fill(transformId);
    await this.page.testSubj.locator('transformWizardNavButtonNext').click();
    await this.page.testSubj.locator('transformStepCreateForm').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('transformWizardCreateButton').click();
    await this.page.testSubj.locator('transformWizardCardManagement').waitFor({ state: 'visible' });
  }

  async returnToManagementFromCreate(): Promise<void> {
    await this.page.testSubj.locator('transformWizardCardManagement').click();
    await this.listContainer.waitFor({ state: 'visible' });
  }

  async openTransformActions(transformId: string): Promise<void> {
    await this.getTransformRow(transformId).getByTestId('euiCollapsedItemActionsButton').click();
    await this.page.testSubj.locator('transformActionEdit').waitFor({ state: 'visible' });
  }

  async openEditFlyout(transformId: string): Promise<void> {
    await this.openTransformActions(transformId);
    await this.page.testSubj.locator('transformActionEdit').click();
    await this.page.testSubj.locator('transformEditFlyout').waitFor({ state: 'visible' });
  }

  async updateTransform(): Promise<void> {
    await this.page.testSubj.locator('transformEditFlyoutUpdateButton').click();
    await this.page.testSubj.locator('transformEditFlyout').waitFor({ state: 'hidden' });
  }

  async expandTransformRow(transformId: string): Promise<void> {
    await this.getTransformRow(transformId).getByTestId('transformListRowDetailsToggle').click();
    await this.page.testSubj.locator('transformExpandedRowTabbedContent').waitFor({
      state: 'visible',
    });
  }

  private async setProjectIncluded(projectId: string, included: boolean): Promise<void> {
    const projectSwitch = this.page.testSubj.locator(`projectPickerListItemSwitch-${projectId}`);
    await projectSwitch.waitFor({ state: 'visible' });

    if ((await projectSwitch.getAttribute('aria-checked')) === String(included)) {
      return;
    }

    await projectSwitch.click();
    await projectSwitch
      .and(this.page.locator(`[aria-checked="${String(included)}"]`))
      .waitFor({ state: 'visible' });
  }

  private async selectDropDownOption(testSubj: string, option: string): Promise<void> {
    await this.page.testSubj.locator(testSubj).click();
    await this.page
      .locator(`[data-test-subj="${testSubj}"] [data-test-subj="comboBoxInput"] input`)
      .fill(option);
    await this.page.keyboard.press('Enter');
  }
}
