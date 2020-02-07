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

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES = [
  ['extension', 'jpg'],
  ['geo.src', 'IN'],
];

export default function({ getService, getPageObjects }) {
  const docTable = getService('docTable');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const esArchiver = getService('esArchiver');

  describe('doc link in discover', function contextSize() {
    this.tags('smoke');
    before(async function() {
      await esArchiver.loadIfNeeded('logstash_functional');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await Promise.all(
        TEST_COLUMN_NAMES.map(columnName => PageObjects.discover.clickFieldListItemAdd(columnName))
      );
      await Promise.all(
        TEST_FILTER_COLUMN_NAMES.map(async ([columnName, value]) => {
          await PageObjects.discover.clickFieldListItem(columnName);
          await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
        })
      );
    });

    it('should open the doc view of the selected document', async function() {
      // navigate to the doc view
      await docTable.clickRowToggle({ rowIndex: 0 });
      await (await docTable.getRowActions({ rowIndex: 0 }))[1].click();

      const hasDocHit = await testSubjects.exists('doc-hit');
      expect(hasDocHit).to.be(true);
    });
  });
}
