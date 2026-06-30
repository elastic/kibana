/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class ExecutionHistoryPage {
  public readonly emptyPrompt: Locator;
  public readonly retryButton: Locator;

  constructor(private readonly page: ScoutPage) {
    // The Rules tab is the default. EuiBasicTable renders `noItemsMessage` in
    // both an a11y `<caption>` and the visible `<td>`, so scope to the cell.
    this.emptyPrompt = this.page.getByRole('cell').getByTestId('ruleExecutionHistoryEmptyPrompt');
    this.retryButton = this.page.testSubj.locator('executionHistoryRetryButton');
  }

  async goto(spaceId?: string) {
    const prefix = spaceId ? `s/${spaceId}/` : '';
    await this.page.gotoApp(`${prefix}management/alertingV2/execution_history`);
  }
}
