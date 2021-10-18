/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);

  describe('legacy urls redirect correctly', () => {
    it('redirects correctly', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();

      const url = await browser.getCurrentUrl();
      const modifiedUrl = url.replace('patterns', 'dataView').replace('indexPatterns', 'dataViews');
      await browser.navigateTo(modifiedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newUrl = await browser.getCurrentUrl();
      expect(newUrl).to.equal(url);
    });
  });
}
