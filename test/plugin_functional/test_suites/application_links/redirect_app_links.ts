/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-app-status-plugin/public/types';

declare global {
  interface Window {
    _nonReloadedFlag?: boolean;
  }
}

const getPathWithHash = (absoluteUrl: string) => {
  const parsed = url.parse(absoluteUrl);
  return `${parsed.path}${parsed.hash ?? ''}`;
};

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  const setNonReloadedFlag = () => {
    return browser.executeAsync(async (cb) => {
      window._nonReloadedFlag = true;
      cb();
    });
  };
  const wasReloaded = () => {
    return browser.executeAsync<boolean>(async (cb) => {
      const reloaded = window._nonReloadedFlag !== true;
      cb(reloaded);
    });
  };

  describe('app links', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('applink_start');
      await setNonReloadedFlag();
    });

    it('navigates to another app without performing a full page refresh', async () => {
      await testSubjects.click('applink-basic-test');

      expect(await testSubjects.exists('app-applink_end')).to.eql(true);
      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/applink_end');
      expect(await wasReloaded()).to.eql(false);
    });

    it('handles the path of the link', async () => {
      await testSubjects.click('applink-path-test');

      expect(await testSubjects.exists('app-applink_end')).to.eql(true);
      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/applink_end/some-path');
      expect(await wasReloaded()).to.eql(false);
    });

    it('handles hash in urls', async () => {
      await testSubjects.click('applink-hash-test');

      expect(await testSubjects.exists('app-applink_end')).to.eql(true);
      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql(
        '/app/applink_end/some-path#/some/hash'
      );
      expect(await wasReloaded()).to.eql(false);
    });

    it('works in a nested dom structure', async () => {
      await testSubjects.click('applink-nested-test');

      expect(await testSubjects.exists('app-applink_end')).to.eql(true);
      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/applink_end#bang');
      expect(await wasReloaded()).to.eql(false);
    });

    it('works for intra-app links', async () => {
      await testSubjects.click('applink-intra-test');

      expect(await testSubjects.exists('app-applink_start')).to.eql(true);
      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/applink_start/some-path');
      expect(await wasReloaded()).to.eql(false);
    });
  });
}
