/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

/**
 * Infra / Metrics host asset details surface that embeds OsqueryAction (`formType='simple'`).
 * Owned by osquery Scout UI per OpenSpec decision 14 (design.md).
 */
export class InventoryHostOsqueryPage {
  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl
  ) {}

  async gotoHostOsqueryTab(spaceId: string, hostname: string): Promise<void> {
    const assetDetails = rison.encode({
      name: hostname,
      preferredSchema: 'semconv',
      tabId: 'overview',
    } as Record<string, unknown>);

    const spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
    const path = `${spacePrefix}/app/metrics/detail/host/${encodeURIComponent(hostname)}`;
    await this.page.goto(this.kbnUrl.get(path, { params: { assetDetails: assetDetails ?? '' } }));
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    await this.page.testSubj.locator('infraAssetDetailsOverviewTab').waitFor({ state: 'visible', timeout: 120_000 });
    await this.page.testSubj.locator('infraAssetDetailsOsqueryTab').click();
    await this.page.testSubj.locator('liveQueryForm').waitFor({ state: 'visible', timeout: 60_000 });
  }

  async submitSimpleEmbeddedQuery(query: string): Promise<void> {
    const editor = this.page.testSubj.locator('liveQueryForm').getByTestId('kibanaCodeEditor');
    await editor.click();
    await this.page.evaluate((q: string) => {
      const w = window as unknown as {
        MonacoEnvironment?: { monaco?: { editor: { getModels: () => Array<{ setValue: (v: string) => void }> } } };
      };
      const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];
      for (const m of models) {
        m.setValue(q);
      }
    }, query);
    await this.page.testSubj.locator('liveQuerySubmitButton').click();
  }
}
