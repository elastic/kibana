/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Combo box options are fetched from the workflows plugin behind a 300ms
 * search debounce, so give the async dropdown more room than the helper's
 * 2.5s default.
 */
const WORKFLOW_OPTIONS_TIMEOUT = 15_000;

/**
 * Drives the create/edit Action Policy form page. Every locator is scoped to
 * the `actionPolicyFormPage` wrapper because the form reuses generic test
 * subjects (`nameInput`, `submitButton`, `cancelButton`) that also exist in
 * the action policy form flyout.
 */
export class ActionPolicyFormPage {
  /** Page-level wrapper; a stable anchor that the form finished rendering. */
  public readonly container: Locator;
  public readonly pageTitle: Locator;
  public readonly nameInput: Locator;
  /** KQL query bar (`QueryStringInput`) backing the `matcher` field. */
  public readonly matcherInput: Locator;
  public readonly submitButton: Locator;
  public readonly cancelButton: Locator;
  /** Shown instead of the workflows combo box when `workflows:ui:enabled` is off. */
  public readonly workflowsDisabledCallout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.container = this.page.testSubj.locator('actionPolicyFormPage');
    this.pageTitle = this.container.getByTestId('pageTitle');
    this.nameInput = this.container.getByTestId('nameInput');
    this.matcherInput = this.container.getByTestId('matcherInput');
    this.submitButton = this.container.getByTestId('submitButton');
    this.cancelButton = this.container.getByTestId('cancelButton');
    this.workflowsDisabledCallout = this.container.getByTestId('workflowsDisabledCallout');
  }

  async gotoCreate() {
    await this.page.gotoApp('management/alertingV2/action_policies/create');
    await this.container.waitFor({ state: 'visible' });
  }

  async gotoEdit(policyId: string) {
    await this.page.gotoApp(`management/alertingV2/action_policies/edit/${policyId}`);
    await this.container.waitFor({ state: 'visible' });
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
  }

  async setMatcher(matcher: string) {
    await this.matcherInput.fill(matcher);
    // Typing opens the KQL suggestions popover, which overlays the rest of the
    // form and would swallow the submit click.
    await this.matcherInput.press('Escape');
  }

  async selectWorkflow(workflowName: string) {
    await this.page.components
      .comboBox('destinationsInput', this.container)
      .setSelectedOptions([workflowName], { timeout: WORKFLOW_OPTIONS_TIMEOUT });
  }

  async submit() {
    await this.submitButton.click();
  }
}
