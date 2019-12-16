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
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }): FtrProviderContext {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header']);
  const testSubjects = getService('testSubjects');

  describe('import saved objects from 6.x to 7.x/8.0.0', function describeIndexTests() {
    describe('.json file', () => {
      beforeEach(async function() {
        // delete .kibana index and then wait for Kibana to re-create it
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
        await esArchiver.load('management');
      });

      afterEach(async function() {
        await esArchiver.unload('management');
      });

      it('should import saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_logstash_700.json')
        );
        await PageObjects.settings.checkImportSucceeded();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
      });
    });
  });
}
