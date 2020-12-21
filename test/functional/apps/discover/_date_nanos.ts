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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const fromTime = 'Sep 22, 2019 @ 20:31:44.000';
  const toTime = 'Sep 23, 2019 @ 03:31:44.000';

  describe('date_nanos', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('date_nanos');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'date-nanos' });
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nanos']);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async function unloadMakelogs() {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('date_nanos');
    });

    it('should show a timestamp with nanoseconds in the first result row', async function () {
      const time = await PageObjects.timePicker.getTimeConfig();
      expect(time.start).to.be(fromTime);
      expect(time.end).to.be(toTime);
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData.startsWith('Sep 22, 2019 @ 23:50:13.253123345')).to.be.ok();
    });
  });
}
