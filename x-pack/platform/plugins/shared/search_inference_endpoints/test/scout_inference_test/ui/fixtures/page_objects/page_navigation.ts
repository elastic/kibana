/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { ScoutPage, Locator } from '@kbn/scout';

export class PageNavigation {
  readonly breadcrumbsContainer: Locator;
  readonly allBreadcrumbs: Locator;
  readonly firstBreadcrumb: Locator;
  readonly lastBreadcrumb: Locator;

  constructor(private readonly page: ScoutPage) {
    this.breadcrumbsContainer = page.testSubj.locator('breadcrumbs');
    this.allBreadcrumbs = page.testSubj.locator('~breadcrumb');
    this.firstBreadcrumb = page.locator('[data-test-subj*="breadcrumb"][data-test-subj*="first"]');
    this.lastBreadcrumb = page.locator('[data-test-subj*="breadcrumb"][data-test-subj*="last"]');
  }

  breadcrumb(text: string): Locator {
    return this.page.testSubj.locator('~breadcrumb').filter({ hasText: text });
  }

  async expectBreadcrumbTexts(
    expectedTexts: string[],
    options?: { isServerless?: boolean }
  ): Promise<void> {
    const allTexts = await this.allBreadcrumbs.allTextContents();
    if (options?.isServerless) {
      // Remove the first breadcrumb (project name)
      expect(allTexts.slice(1)).toStrictEqual(expectedTexts);
    } else {
      expect(allTexts).toStrictEqual(expectedTexts);
    }
  }
}
