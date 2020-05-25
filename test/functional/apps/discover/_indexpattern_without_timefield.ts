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

  describe('indexpattern without timefield', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('index_pattern_without_timefield');
    });

    beforeEach(async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('without-timefield');
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('index_pattern_without_timefield');
    });

    it('should not display a timepicker', async function () {
      const timepickerExists = await PageObjects.timePicker.timePickerExists();
      expect(timepickerExists).to.be(false);
    });

    it('should display a timepicker after switching to an index pattern with timefield', async function () {
      expect(await PageObjects.timePicker.timePickerExists()).to.be(false);
      await PageObjects.discover.selectIndexPattern('with-timefield');
      expect(await PageObjects.timePicker.timePickerExists()).to.be(true);
    });
  });
}
