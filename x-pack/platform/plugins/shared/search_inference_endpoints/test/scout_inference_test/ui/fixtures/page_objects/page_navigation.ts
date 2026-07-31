/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';

export class PageNavigation {
  readonly allBreadcrumbs: Locator;

  constructor(private readonly page: ScoutPage, private readonly chrome: PageObjects['chrome']) {
    this.allBreadcrumbs = page.testSubj.locator('~breadcrumb');
  }

  async expectClassicBreadcrumbTexts(expectedTexts: string[]): Promise<void> {
    await expect(this.allBreadcrumbs).toHaveText(expectedTexts);
  }

  async expectServerlessClassicBreadcrumbTexts(expectedTexts: string[]): Promise<void> {
    const allTexts = await this.allBreadcrumbs.allTextContents();
    expect(allTexts.slice(1)).toStrictEqual(expectedTexts);
  }

  async expectPageUrlContains(pathFragment: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(pathFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  }

  async expectInferencePage(options: {
    pageHeader: Locator;
    urlPath: string;
    classicBreadcrumbs: string[];
    isServerless?: boolean;
  }): Promise<void> {
    await expect(options.pageHeader).toBeVisible();
    await this.expectPageUrlContains(options.urlPath);

    if (await this.chrome.isNextChrome()) {
      return;
    }

    if (options.isServerless) {
      await this.expectServerlessClassicBreadcrumbTexts(options.classicBreadcrumbs);
      return;
    }

    await this.expectClassicBreadcrumbTexts(options.classicBreadcrumbs);
  }
}
