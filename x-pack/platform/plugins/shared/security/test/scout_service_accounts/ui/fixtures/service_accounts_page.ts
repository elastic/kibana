/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/** How long the app may take to render, which is long on a cold local stack. */
const PAGE_LOAD_TIMEOUT_MS = 30_000;
/** Stops a runaway "Load more" loop. 50 pages of 100 covers 5,000 accounts. */
const MAX_ACCOUNT_PAGES = 50;

export class ServiceAccountsPage {
  readonly flyout;
  readonly rolesSelector;
  readonly submitButton;
  readonly description;
  readonly table;
  readonly search;
  readonly deleteConfirmModal;
  readonly boundModal;
  readonly boundWorkloadsTable;
  readonly workloadsModal;
  readonly loading;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.getByTestId('createServiceAccountFlyout');
    this.rolesSelector = page.getByTestId('serviceAccountRolesSelector');
    this.submitButton = page.getByTestId('createServiceAccountSubmit');
    this.description = page.getByTestId('createServiceAccountDescription');
    this.table = page.getByTestId('serviceAccountsTable');
    this.search = page.getByTestId('serviceAccountsSearch');
    this.deleteConfirmModal = page.getByTestId('serviceAccountDeleteConfirmModal');
    this.boundModal = page.getByTestId('serviceAccountBoundModal');
    this.boundWorkloadsTable = page.components.basicTable('serviceAccountBoundWorkloadsTable');
    this.workloadsModal = page.getByTestId('serviceAccountWorkloadsModal');
    this.loading = page.getByTestId('serviceAccountsLoading');
  }

  async goto() {
    await this.page.gotoApp('management/security/service_accounts');
    await this.table.waitFor({ state: 'visible', timeout: PAGE_LOAD_TIMEOUT_MS });
  }

  /** The table row of the account named `name`, once the table is searched for it. */
  accountRow(name: string) {
    return this.table.getByRole('row').filter({ hasText: name });
  }

  /**
   * Loads every page of accounts. The table shows at most 100 accounts at first, sorted by
   * principal, so a fixture can land on a later page when the cluster already holds others.
   */
  async loadAllAccounts() {
    const loadMore = this.page.getByTestId('serviceAccountsLoadMore');
    for (let loadedPages = 1; await loadMore.isVisible(); loadedPages++) {
      if (loadedPages >= MAX_ACCOUNT_PAGES) {
        throw new Error(`The service accounts did not end within ${MAX_ACCOUNT_PAGES} pages.`);
      }
      await Promise.all([
        this.page.waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            new URL(response.url()).pathname.endsWith('/internal/security/service_account')
        ),
        loadMore.click(),
      ]);
      // The button stays disabled until the page renders, then goes away after the last page.
      await expect
        .poll(async () => !(await loadMore.isVisible()) || (await loadMore.isEnabled()))
        .toBe(true);
    }
  }

  /** Searches every account, not only the first page, for `name`. */
  async searchFor(name: string) {
    await this.loadAllAccounts();
    await this.search.fill(name);
    // The incremental search reacts to keys, not to the filled value.
    await this.search.press('Enter');
  }

  async openDelete(name: string) {
    await this.accountRow(name).getByTestId('serviceAccountsDeleteAction').click();
  }

  /** How many workloads are bound to the account named `name`, as its row shows it. */
  workloadCount(name: string) {
    return this.accountRow(name).getByTestId('serviceAccountWorkloadCount');
  }

  /** The View link next to the workload count of the account named `name`. */
  viewWorkloadsLink(name: string) {
    return this.accountRow(name).getByTestId('serviceAccountViewWorkloads');
  }

  async openWorkloads(name: string) {
    await this.viewWorkloadsLink(name).click();
  }

  async closeWorkloads() {
    await this.workloadsModal.getByTestId('serviceAccountWorkloadsModalClose').click();
  }

  /** The link to the bound workload titled `title`, in the bound modal. */
  boundWorkloadLink(title: string) {
    return this.boundModal
      .getByTestId('serviceAccountBoundWorkloadLink')
      .filter({ hasText: title });
  }

  async confirmDelete() {
    await this.deleteConfirmModal.getByTestId('confirmModalConfirmButton').click();
  }

  async forceDelete() {
    await this.boundModal.getByTestId('serviceAccountForceDeleteButton').click();
  }

  /**
   * Waits for the accounts to load again after a delete. The page shows the table or, once the
   * last account is gone, an empty prompt, so this waits for the loading indicator to go away.
   */
  async waitForReload() {
    await this.loading.waitFor({ state: 'hidden', timeout: PAGE_LOAD_TIMEOUT_MS });
  }

  async openCreateFlyout() {
    await this.page.gotoApp('management/security/service_accounts/create');
    await this.flyout.waitFor({ state: 'visible', timeout: PAGE_LOAD_TIMEOUT_MS });
  }

  async setName(name: string) {
    await this.page.testSubj.fill('serviceAccountNameInput', name);
  }

  async openRoles() {
    await this.rolesSelector.click();
  }

  roleOption(name: string) {
    return this.page.testSubj.locator(`roleOption-${name}`);
  }

  async selectRole(name: string) {
    await this.roleOption(name).click();
  }

  async closeRoles() {
    await this.page.keyboard.press('Escape');
  }

  async cancel() {
    await this.flyout.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
}
