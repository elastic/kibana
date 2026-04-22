/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';
import { submitLiveQuery } from '../../common/submit_live_query';

/**
 * Infra / Metrics host asset details surface that embeds OsqueryAction (`formType='simple'`).
 * Owned by osquery Scout UI per OpenSpec decision 14 (design.md).
 */
export class InventoryHostOsqueryPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoHostOsqueryTab(spaceId: string, hostname: string): Promise<void> {
    // The Osquery tab is only rendered when the host uses the ECS schema
    // (see `useConditionalTabs` in infra/public/components/asset_details/hooks/use_page_header.tsx:
    // `[ContentTabIds.OSQUERY]: Boolean(featureFlags.osqueryEnabled) && schema === 'ecs'`).
    // Requesting `preferredSchema: 'semconv'` hides the tab even when all other
    // prerequisites (enrollment, osquery_manager integration) are met.
    const assetDetails = rison.encode({
      name: hostname,
      preferredSchema: 'ecs',
      tabId: 'overview',
    } as Record<string, unknown>);

    const spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
    const path = `${spacePrefix}/app/metrics/detail/host/${encodeURIComponent(hostname)}`;
    await this.page.goto(this.kbnUrl.get(path, { params: { assetDetails: assetDetails ?? '' } }));
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    await this.page.testSubj
      .locator('infraAssetDetailsOverviewTab')
      .waitFor({ state: 'visible', timeout: 120_000 });
    await this.page.testSubj.locator('infraAssetDetailsOsqueryTab').click();
    await this.page.testSubj
      .locator('liveQueryForm')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async submitSimpleEmbeddedQuery(query: string): Promise<void> {
    // Embedded OsqueryAction (`formType='simple'`) renders the shared OsqueryEditor;
    // target the osquery-owned wrapper (added in public/editor/index.tsx) rather than
    // the generic `.kibanaCodeEditor` class which also appears in other CodeEditor
    // instances on the page.
    const liveQueryForm = this.page.testSubj.locator('liveQueryForm');
    const editor = liveQueryForm.getByTestId('osqueryEditor');
    await editor.waitFor({ state: 'visible', timeout: 60_000 });
    await editor.click();
    await editor.pressSequentially(query, { delay: 5 });

    // Submit via the shared helper: network-verified with retries to beat the
    // 500 ms Monaco onChange debounce that otherwise leaves the RHF `query`
    // field empty on the first click. See `common/submit_live_query.ts`.
    await submitLiveQuery(
      this.page,
      liveQueryForm.locator('[data-test-subj="liveQuerySubmitButton"]')
    );
  }
}
