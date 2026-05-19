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
    // EuiBasicTable renders `noItemsMessage` in both an a11y `<caption>` and the
    // visible `<td>`, so the empty-prompt test-subj appears twice. Scope to the
    // cell so we match only the visible copy.
    this.emptyPrompt = this.page.getByRole('cell').getByTestId('executionHistoryEmptyPrompt');
    this.retryButton = this.page.testSubj.locator('executionHistoryRetryButton');
  }

  async goto() {
    await this.page.gotoApp('management/alertingV2/execution_history');
  }
}
