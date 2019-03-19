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
  const esArchiver = getService('esArchiver');
  const pieChart = getService('pieChart');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['dashboard', 'discover']);

  describe('dashboard query bar', async () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('dashboard with filter');
    });

    it('causes panels to reload when refresh is clicked', async () => {
      await esArchiver.unload('dashboard/current/data');

      await queryBar.clickQuerySubmitButton();
      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(0);

      await pieChart.expectPieSliceCount(0);
    });
  });
}
