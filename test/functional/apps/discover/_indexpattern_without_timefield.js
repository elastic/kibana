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
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const kibanaServer = getService('kibanaServer');

  describe('indexpattern without timefield', function() {
    before(async function() {
      await esArchiver.loadIfNeeded('index_pattern_without_timefield');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'without-timefield' });
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('index_pattern_without_timefield');
    });

    it('should not display a timepicker', async function() {
      const timepickerExists = await PageObjects.timePicker.timePickerExists();
      expect(timepickerExists).to.be(false);
    });
  });
}
