/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { ScoutPage } from '@kbn/scout';

export class SnapshotRestorePage {
  constructor(private readonly page: ScoutPage) {}

  async waitForSnapshotsTab({
    state = 'noRepos',
  }: { state?: 'noRepos' | 'noSnapshots' | 'hasSnapshots' | 'loaded' } = {}) {
    // `loaded` accepts either empty-or-populated snapshots: the count is global across all
    // repositories, so on ECH `noSnapshots` never resolves.
    if (state === 'loaded') {
      await this.page.testSubj
        .locator('emptyPrompt')
        .or(this.page.testSubj.locator('snapshotList'))
        .waitFor({ state: 'visible' });
      return;
    }

    const selectorMap = {
      noRepos: 'registerRepositoryButton',
      noSnapshots: 'emptyPrompt',
      hasSnapshots: 'snapshotList',
    };
    await this.page.testSubj.waitForSelector(selectorMap[state], { state: 'visible' });
  }

  async appTitleText(): Promise<string> {
    return this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title).innerText();
  }

  async navToRepositories() {
    await this.page.testSubj.click('repositories_tab');
    await this.page.testSubj.waitForSelector('registerRepositoryButton', { state: 'visible' });
  }

  async navToSnapshots({ empty = true }: { empty?: boolean } = {}) {
    await this.page.testSubj.click('snapshots_tab');
    const selector = empty ? 'emptyPrompt' : 'snapshotList';
    await this.page.testSubj.waitForSelector(selector, { state: 'visible' });
  }

  async navToPolicies() {
    await this.page.testSubj.click('policies_tab');
    await this.page.testSubj.waitForSelector('createPolicyButton', { state: 'visible' });
  }

  async navToRestoreStatus({ empty = true }: { empty?: boolean } = {}) {
    await this.page.testSubj.click('restore_status_tab');
    const selector = empty ? 'noRestoredSnapshotsHeader' : 'restoreList';
    await this.page.testSubj.waitForSelector(selector, { state: 'visible' });
  }

  async fillCreateNewPolicyPageOne(
    policyName: string,
    snapshotName: string,
    repositoryName?: string
  ) {
    await this.page.testSubj.click('createPolicyButton');
    await this.page.testSubj.fill('nameInput', policyName);
    await this.page.testSubj.fill('snapshotNameInput', snapshotName);
    if (repositoryName) {
      await this.page.testSubj.locator('repositorySelect').selectOption(repositoryName);
    }
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('allIndicesToggle', { state: 'visible' });
  }

  async fillCreateNewPolicyPageTwo(singleIndexToSelect?: string) {
    if (singleIndexToSelect) {
      await this.page.testSubj.click('allIndicesToggle');
      await this.page.testSubj.click('useIndexPatternsButton');
      await this.setIndexPattern('indexPatternsComboBox', singleIndexToSelect);
    }
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('expireAfterValueInput', { state: 'visible' });
  }

  async fillCreateNewPolicyPageThree() {
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('submitButton', { state: 'visible' });
  }

  async submitNewPolicy() {
    await this.page.testSubj.click('submitButton');
    await this.page.testSubj.waitForSelector('policyActionMenuButton', { state: 'visible' });
  }

  async closeFlyout() {
    await this.page.testSubj.click('srPolicyDetailsFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('policyLink', { state: 'visible' });
  }

  async viewRepositoryDetails(name: string) {
    // Anchored: a bare `hasText` substring match selects two rows when one repository name is a
    // prefix of another, which then trips strict mode.
    await this.page.testSubj
      .locator('repositoryTable')
      .locator('[data-test-subj="row"]')
      .filter({
        has: this.page.testSubj
          .locator('repositoryLink')
          .filter({ hasText: new RegExp(`^${name}$`) }),
      })
      .locator('[data-test-subj="repositoryLink"]')
      .click();
    await this.page.testSubj.locator('title').filter({ hasText: name }).waitFor({
      state: 'visible',
    });
  }

  async performRepositoryCleanup(): Promise<string> {
    await this.page.testSubj.click('cleanupRepositoryButton');
    await this.page.testSubj.waitForSelector('cleanupCodeBlock', { state: 'visible' });
    return this.page.testSubj.locator('cleanupCodeBlock').innerText();
  }

  /** Row in the snapshots table whose snapshot name contains `nameContains`. */
  private snapshotRow(nameContains: string) {
    return this.page.testSubj
      .locator('snapshotTable')
      .locator('[data-test-subj="row"]')
      .filter({
        has: this.page.testSubj.locator('snapshotLink').filter({ hasText: nameContains }),
      });
  }

  /** Row in the restore-status table for the named restored index. */
  restoreStatusRow(indexName: string) {
    return this.page.testSubj
      .locator('restoreList')
      .locator('[data-test-subj="row"]')
      .filter({
        has: this.page.testSubj.locator('restoreTableIndex').filter({ hasText: indexName }),
      });
  }

  async clickSnapshotLink(nameContains: string) {
    await this.snapshotRow(nameContains).locator('[data-test-subj="snapshotLink"]').click();
  }

  async clickSnapshotRestoreButton(nameContains: string) {
    await this.snapshotRow(nameContains)
      .locator('[data-test-subj="srsnapshotListRestoreActionButton"]')
      .click();
  }

  /**
   * Reloads the snapshots table once then waits for the named snapshot's row to show a terminal
   * state. Callers wait on Elasticsearch first (`waitForSlmSnapshotToFinish`), so a single reload
   * is enough to surface the completed state in the UI.
   */
  async waitUntilSnapshotComplete(nameContains: string) {
    await this.page.testSubj
      .locator('reloadButton')
      .click()
      .catch(() => {});
    await this.snapshotRow(nameContains)
      .locator('[data-test-subj="snapshotState"]')
      .filter({ hasText: /Complete|Partial/ })
      .waitFor({ state: 'visible' });
  }

  async closeSnapshotFlyout() {
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('snapshotLink', { state: 'visible' });
  }

  /**
   * Expands a collapsed snapshot index list. `collapsibleIndicesArrow` only renders above 10
   * indices (`maximumItemPreviewCount`), so only call this for snapshots known to exceed that.
   */
  async clickShowCollapsedIndices() {
    await this.page.testSubj.click('collapsibleIndicesArrow');
  }

  async clickPolicyNameLink(name: string) {
    await this.page.testSubj.locator('policyLink').filter({ hasText: name }).click();
  }

  async clickPolicyActionButton() {
    await this.page.testSubj.click('policyActionMenuButton');
    await this.page.testSubj.waitForSelector('policyActionMenuRunPolicy', { state: 'visible' });
  }

  async clickRunPolicy() {
    await this.page.testSubj.click('policyActionMenuRunPolicy');
    await this.page.testSubj.waitForSelector('confirmModalConfirmButton', { state: 'visible' });
  }

  async clickConfirmationModal() {
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /**
   * Commits a free-text index pattern. Targets the wrapper `data-test-subj` (added to both forms)
   * rather than the inner `comboBoxSearchInput`, which the feature-states combo box also uses —
   * the bare selector matches two elements and trips strict mode. `setCustomSelectedOptions`
   * because a pattern is created via `onCreateOption`, not picked from existing options.
   */
  private async setIndexPattern(comboBoxTestSubj: string, pattern: string) {
    await this.page.components.comboBox(comboBoxTestSubj).setCustomSelectedOptions([pattern]);
  }

  async restoreSnapshot(indexName: string, rename: boolean = false) {
    await this.page.testSubj.click('restoreSnapshotButton');
    await this.page.testSubj.waitForSelector('snapshotRestoreApp', { state: 'visible' });

    await this.page.testSubj.click('allDsAndIndicesToggle');
    await this.page.testSubj.click('restoreIndexPatternsButton');
    await this.setIndexPattern('restoreIndexPatternsComboBox', indexName);

    if (rename) {
      await this.page.testSubj.click('restoreRenameToggle');
      await this.page.testSubj.fill('capturePattern', `${indexName}(.*)`);
      await this.page.testSubj.fill('replacementPattern', `restored_${indexName}$1`);
    }
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('indexSettingsTitle', { state: 'visible' });
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('reviewSnapshotTitle', { state: 'visible' });
    await this.page.testSubj.click('restoreButton');
  }
}
