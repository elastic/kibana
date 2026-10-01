/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class EmbeddableAlertsTablePage {
  public readonly alertsTableLoaded: Locator;
  public readonly alertsTableEmptyState: Locator;
  public readonly alertRowCells: Locator;

  constructor(private readonly page: ScoutPage) {
    this.alertsTableLoaded = this.page.testSubj.locator('alertsTableIsLoaded');
    this.alertsTableEmptyState = this.page.testSubj.locator('alertsTableEmptyState');
    this.alertRowCells = this.page.testSubj.locator('dataGridRowCell');
  }

  async getAlertRowCount(): Promise<number> {
    return this.alertRowCells.count();
  }
}
