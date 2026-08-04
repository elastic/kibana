/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { EntityStoreStatus, GetEntityStoreStatusResponse } from '../../../../../common';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';

const PAGE_URL = 'security/entity_analytics_management';

/**
 * Minimal page object for the Security Entity Analytics management page.
 * Lives here (not @kbn/scout-security) so platform entity_store Scout UI tests
 * stay within platform package boundaries.
 */
export class EntityAnalyticsManagementPage {
  public readonly entityAnalyticsSwitch: Locator;
  public readonly entityAnalyticsHealth: Locator;
  public readonly statusLoading: Locator;

  constructor(private readonly page: ScoutPage) {
    this.entityAnalyticsSwitch = this.page.testSubj.locator('entity-analytics-switch');
    this.entityAnalyticsHealth = this.page.testSubj.locator('entity-analytics-health');
    this.statusLoading = this.page.testSubj.locator('entity-analytics-status-loading');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp(PAGE_URL);
  }

  async toggleEntityAnalytics(): Promise<void> {
    // Wait for visible + enabled — the switch mounts disabled while status loads.
    await this.entityAnalyticsSwitch.waitFor({ state: 'visible' });
    await expect(this.entityAnalyticsSwitch).toBeEnabled();
    await this.entityAnalyticsSwitch.click();
  }

  async waitForStatusLoaded(): Promise<void> {
    await this.statusLoading.waitFor({ state: 'detached', timeout: 30000 });
    await this.entityAnalyticsHealth.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clearEntityData(): Promise<void> {
    const modal = this.page.testSubj.locator('clear-entity-data-modal');
    await this.page.testSubj.locator('clear-entity-data-button').click();
    await modal.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await modal.waitFor({ state: 'detached' });
  }
}

export const waitForEntityStoreStatus = async (
  kbnClient: KbnClient,
  expectedStatus: EntityStoreStatus,
  timeoutMs: number = 60000
): Promise<GetEntityStoreStatusResponse> => {
  const startTime = Date.now();
  let lastStatus: GetEntityStoreStatusResponse | undefined;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await kbnClient.request<GetEntityStoreStatusResponse>({
        method: 'GET',
        path: ENTITY_STORE_ROUTES.public.STATUS,
        headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
      });
      lastStatus = response.data;
      if (lastStatus.status === expectedStatus) {
        return lastStatus;
      }
    } catch {
      // Status can 404 while uninstalling; keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timeout waiting for entity store status '${expectedStatus}' after ${timeoutMs}ms. Last status: ${JSON.stringify(
      lastStatus
    )}`
  );
};
