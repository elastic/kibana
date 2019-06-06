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

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const DEFAULT_REQUEST = `

GET _search
{
  "query": {
    "match_all": {}
  }
}

`.trim();

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('console app', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    it('should show the default request', async () => {
      // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
      await PageObjects.console.collapseHelp();
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getRequest();
        log.debug(actualRequest);
        expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = '"timed_out" : false,';
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });

    it('settings should allow changing the text size', async () => {
      await PageObjects.console.setFontSizeSetting(20);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('20px');
      });

      await PageObjects.console.setFontSizeSetting(24);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('24px');
      });
    });
  });
}
