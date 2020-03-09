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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('source filters', function describeIndexTests() {
    before(async function() {
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('visualize_source-filters');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      await PageObjects.common.sleep(1000);
    });

    it('should not get the field referer', async function() {
      const fieldNames = await PageObjects.discover.getAllFieldNames();
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter(
        fieldName => fieldName.indexOf('relatedContent') === 0
      );
      expect(relatedContentFields).to.have.length(0);
    });
  });
}
