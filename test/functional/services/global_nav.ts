/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function GlobalNavProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  class GlobalNav {
    public async moveMouseToLogo(): Promise<void> {
      await testSubjects.moveMouseTo('headerGlobalNav > logo');
    }

    public async clickLogo(): Promise<void> {
      return await testSubjects.click('headerGlobalNav > logo');
    }

    public async clickNewsfeed(): Promise<void> {
      return await testSubjects.click('headerGlobalNav > newsfeed');
    }

    public async exists(): Promise<boolean> {
      return await testSubjects.exists('headerGlobalNav');
    }

    public async getFirstBreadcrumb(): Promise<string> {
      return await testSubjects.getVisibleText(
        'headerGlobalNav > breadcrumbs > ~breadcrumb & ~first'
      );
    }

    public async getLastBreadcrumb(): Promise<string> {
      return await testSubjects.getVisibleText(
        'headerGlobalNav > breadcrumbs > ~breadcrumb & ~last'
      );
    }

    public async badgeExistsOrFail(expectedLabel: string): Promise<void> {
      await testSubjects.existOrFail('headerBadge');
      const actualLabel = await testSubjects.getAttribute('headerBadge', 'data-test-badge-label');
      expect(actualLabel.toUpperCase()).to.equal(expectedLabel.toUpperCase());
    }

    public async badgeMissingOrFail(): Promise<void> {
      await testSubjects.missingOrFail('headerBadge');
    }
  }

  return new GlobalNav();
}
