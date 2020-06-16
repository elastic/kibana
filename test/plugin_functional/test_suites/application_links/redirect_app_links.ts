/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '../../plugins/core_app_status/public/types';

declare global {
  interface Window {
    __nonReloadedFlag?: boolean;
  }
}

const getPathWithHash = (absoluteUrl: string) => {
  const parsed = url.parse(absoluteUrl);
  return `${parsed.path}${parsed.hash ?? ''}`;
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  const setNonReloadedFlag = () => {
    return browser.executeAsync(async (cb) => {
      window.__nonReloadedFlag = true;
      cb();
    });
  };
  const wasReloaded = () => {
    return browser.executeAsync<boolean>(async (cb) => {
      const reloaded = window.__nonReloadedFlag !== true;
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
