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

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const inspector = getService('inspector');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover field visualize button', () => {
    before(async function() {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
    });

    beforeEach(async () => {
      log.debug('go to discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('should visualize a field in area chart', async () => {
      await PageObjects.discover.clickFieldListItem('phpmemory');
      log.debug('visualize a phpmemory field');
      await PageObjects.discover.clickFieldListItemVisualize('phpmemory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const expectedTableData = [
        ['0', '10'],
        ['58,320', '2'],
        ['171,080', '2'],
        ['3,240', '1'],
        ['3,520', '1'],
        ['3,880', '1'],
        ['4,120', '1'],
        ['4,640', '1'],
        ['4,760', '1'],
        ['5,680', '1'],
        ['7,160', '1'],
        ['7,400', '1'],
        ['8,400', '1'],
        ['8,800', '1'],
        ['8,960', '1'],
        ['9,400', '1'],
        ['10,280', '1'],
        ['10,840', '1'],
        ['13,080', '1'],
        ['13,360', '1'],
      ];
      await inspector.open();
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });
  });
}
