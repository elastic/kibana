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

export default function({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'timePicker']);

  describe('Index patterns on aliases', function() {
    before(async function() {
      await esArchiver.loadIfNeeded('alias');
      await esArchiver.load('empty_kibana');
      await es.indices.updateAliases({
        body: {
          actions: [
            { add: { index: 'test1', alias: 'alias1' } },
            { add: { index: 'test2', alias: 'alias1' } },
            { add: { index: 'test3', alias: 'alias1' } },
            { add: { index: 'test4', alias: 'alias1' } },
            { add: { index: 'test5', alias: 'alias2' } },
            { add: { index: 'test6', alias: 'alias2' } },
            { add: { index: 'test7', alias: 'alias2' } },
            { add: { index: 'test8', alias: 'alias2' } },
            { add: { index: 'test9', alias: 'alias2' } },
          ],
        },
      });
    });

    it('should be able to create index pattern without time field', async function() {
      await PageObjects.settings.createIndexPattern('alias1', null);
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('alias1*');
    });

    it('should be able to discover and verify no of hits for alias1', async function() {
      const expectedHitCount = '4';
      await PageObjects.common.navigateToApp('discover');
      await retry.try(async function() {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    it('should be able to create index pattern with timefield', async function() {
      await PageObjects.settings.createIndexPattern('alias2', 'date');
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('alias2*');
    });

    it('should be able to discover and verify no of hits for alias2', async function() {
      const expectedHitCount = '5';
      const fromTime = 'Nov 12, 2016 @ 05:00:00.000';
      const toTime = 'Nov 19, 2016 @ 05:00:00.000';

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('alias2');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

      await retry.try(async function() {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    after(async () => {
      await esArchiver.unload('alias');
    });
  });
}
