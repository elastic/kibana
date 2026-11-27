/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableObject, Locator, ScoutPage } from '@kbn/scout';
import type { AlertingMountConfig } from './alerting_mount_config';

/** Drives the Import alerts page, which lists the external sources of the current space. */
export class ImportsListPage {
  public readonly table: EuiBasicTableObject;
  public readonly searchBox: Locator;
  /** The Name cells of the current page, in row order. */
  public readonly nameCells: Locator;
  /** The Type cells of the current page, in row order. */
  public readonly typeCells: Locator;
  /** The row actions buttons, only shown to users who can delete imports. */
  public readonly actionsButtons: Locator;
  public readonly deleteConfirmModal: Locator;

  constructor(private readonly page: ScoutPage, private readonly mountConfig: AlertingMountConfig) {
    this.table = this.page.components.basicTable('importsTable');
    this.searchBox = this.page.testSubj.locator('importsListSearch');
    this.nameCells = this.table.column(0);
    this.typeCells = this.table.column(1);
    this.actionsButtons = this.page.locator('[data-test-subj^="importActionsButton-"]');
    this.deleteConfirmModal = this.page.testSubj.locator('importsDeleteConfirmModal');
  }

  async goto() {
    await this.page.gotoApp(`${this.mountConfig.appRoute}${this.mountConfig.subPaths.imports}`, {
      readyWhen: this.page.testSubj.locator('importsTable'),
    });
  }

  async search(value: string) {
    await this.searchBox.fill(value);
  }

  async deleteImport(importId: string) {
    await this.page.testSubj.click(`importActionsButton-${importId}`);
    await this.page.testSubj.click('importsDeleteAction');
    await this.deleteConfirmModal.getByRole('button', { name: 'Delete' }).click();
    await this.deleteConfirmModal.waitFor({ state: 'hidden' });
  }

  async sortBy(columnName: 'Name' | 'Type') {
    await this.table.headerCells.filter({ hasText: columnName }).getByRole('button').click();
  }
}
