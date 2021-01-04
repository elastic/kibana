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

  describe('chrome helpMenu links', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('core_help_menu');
      await setNonReloadedFlag();
    });

    it('navigates to internal custom links without performing a full page refresh', async () => {
      await testSubjects.click('helpMenuButton');
      await testSubjects.click('coreHelpMenuInternalLinkTest');

      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/management');
      expect(await wasReloaded()).to.eql(false);
    });
  });
}
