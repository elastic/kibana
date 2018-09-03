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
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);

  async function selectSample(sampleId) {
    await testSubjects.click('sampleSelect');
    await find.clickByCssSelector(`option[value="sample-${sampleId}"]`);
    await testSubjects.waitForDeleted('visLoadingIndicator');
  }

  async function getTableData() {
    const data = await PageObjects.visualize.getTableVisData();
    return data.trim().split('\n');
  }

  describe('embed by id', function describeIndexTests() {

    it('should correctly embed timebased data without a date histogram', async () => {
      await selectSample('timebased_no-datehistogram');
      const data = await getTableData();
      expect(data).to.be.eql([
        'jpg', '9,109',
        'css', '2,159',
        'png', '1,373',
        'gif', '918',
        'php', '445',
      ]);
    });

    it('should correctly embed timebased data without a date histogram setting a timeRange', async () => {
      await selectSample('timebased_no-datehistogram_timerange');
      const data = await getTableData();
      expect(data).to.be.eql([
        'jpg', '3,005',
        'css', '720',
        'png', '455',
        'gif', '300',
        'php', '142',
      ]);
    });
  });

}
