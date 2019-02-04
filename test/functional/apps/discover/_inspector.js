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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');

  const STATS_ROW_NAME_INDEX = 0;
  const STATS_ROW_VALUE_INDEX = 1;
  function getHitCount(requestStats) {
    const hitsCountStatsRow = requestStats.find((statsRow) => {
      return statsRow[STATS_ROW_NAME_INDEX] === 'Hits (total)';
    });
    return hitsCountStatsRow[STATS_ROW_VALUE_INDEX];
  }

  describe('inspect', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('discover');
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });

      await PageObjects.common.navigateToApp('discover');
    });

    afterEach(async () => {
      await inspector.close();
    });

    it('should display request stats with no results', async () => {
      await inspector.open();
      const requestStats = await inspector.getTableData();

      expect(getHitCount(requestStats)).to.be('0');
    });

    it('should display request stats with results', async () => {
      await PageObjects.header.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-23 18:31:44.000');

      await inspector.open();
      const requestStats = await inspector.getTableData();

      expect(getHitCount(requestStats)).to.be('14004');
    });

  });
}
