/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CONVERT_TO_ESQL_BUTTON_LABEL = 'Convert to ES|QL';

export class LensPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('lens');
  }

  getLensApp() {
    return this.page.getByTestId('lnsApp');
  }

  /**
   * Get the workspace panel where visualizations are built
   */
  getWorkspacePanel() {
    return this.page.getByTestId('lnsWorkspacePanelWrapper__innerContent');
  }

  /**
   * Wait for the Lens editor to be ready
   */
  async waitForLensReady() {
    await this.getLensApp().waitFor({ state: 'visible' });
    await this.getWorkspacePanel().waitFor({ state: 'visible' });
  }

  /**
   * Check if workspace has any errors
   */
  async hasWorkspaceErrors() {
    const errorElement = this.page.getByTestId('lnsWorkspaceErrors');
    return errorElement.isVisible().catch(() => false);
  }

  // 'Convert to ES|QL'
  getConvertToEsqlButton() {
    this.page.getByRole('button', { name: CONVERT_TO_ESQL_BUTTON_LABEL });
  }
}
