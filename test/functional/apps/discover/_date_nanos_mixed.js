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

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const kibanaServer = getService('kibanaServer');
  const fromTime = '2019-01-01 00:00:00.000';
  const toTime = '2019-01-01 23:59:59.999';

  describe('date_nanos_mixed', function () {

    before(async function () {
      await esArchiver.loadIfNeeded('date_nanos_mixed');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': 'timestamp-mixed-*' });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('date_nanos_mixed');
    });

    it('should show a timestamp with nanoseconds in the right order result row', async function () {
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData.startsWith('Sep 22, 2019 @ 23:50:13.253123345')).to.be.ok();
    });
  });

}
