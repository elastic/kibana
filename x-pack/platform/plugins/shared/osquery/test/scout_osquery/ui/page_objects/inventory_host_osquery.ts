/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { submitLiveQuery } from '../../common/submit_live_query';

/** Infra host asset details — embedded Osquery live query form. */
export class InventoryHostOsqueryPage {
  public readonly overviewTab: Locator;
  public readonly osqueryTab: Locator;
  public readonly liveQueryForm: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.overviewTab = this.page.testSubj.locator('infraAssetDetailsOverviewTab');
    this.osqueryTab = this.page.testSubj.locator('infraAssetDetailsOsqueryTab');
    this.liveQueryForm = this.page.testSubj.locator('liveQueryForm');
  }

  async gotoHostOsqueryTab(spaceId: string, hostname: string): Promise<void> {
    // Osquery tab requires ECS schema in asset details (not semconv).
    const assetDetails = rison.encode({
      name: hostname,
      preferredSchema: 'ecs',
      tabId: 'overview',
    } as Record<string, unknown>);

    const spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
    const path = `${spacePrefix}/app/metrics/detail/host/${encodeURIComponent(hostname)}`;
    await this.page.goto(this.kbnUrl.get(path, { params: { assetDetails: assetDetails ?? '' } }));
    await this.overviewTab.waitFor({ state: 'visible', timeout: 120_000 });
    await this.osqueryTab.click();
    await this.liveQueryForm.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Types `query` into the embedded osquery editor and submits it.
   *
   * Returns:
   * - `actionId`: top-level umbrella id from `POST /api/osquery/live_queries`.
   * - `queryActionIds`: per-query ids — seed `indexActionResponses` /
   *   `indexResultRows` with `queryActionIds[0]` for the inventory tab's
   *   single-query flow. The results UI filters on per-query ids, so seeding
   *   under `actionId` would leave the results panel pending.
   */
  async submitSimpleEmbeddedQuery(
    query: string
  ): Promise<{ actionId?: string; queryActionIds: string[] }> {
    // Use osqueryEditor test-subj (other CodeEditors share kibanaCodeEditor).
    const editor = this.liveQueryForm.getByTestId('osqueryEditor');
    await editor.waitFor({ state: 'visible', timeout: 60_000 });
    await editor.click();
    await editor.pressSequentially(query, { delay: 5 });

    // submitLiveQuery beats Monaco debounce / empty RHF query on first click.
    const { actionId, queryActionIds } = await submitLiveQuery(
      this.page,
      this.liveQueryForm.locator('[data-test-subj="liveQuerySubmitButton"]')
    );

    return { actionId, queryActionIds };
  }
}
