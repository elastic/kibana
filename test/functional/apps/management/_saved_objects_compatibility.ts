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

// Data being used for testing here is from

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }): FtrProviderContext {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header']);

  describe('import saved objects from 6.x to 7.x/8.0.0', function describeIndexTests() {
    describe('.json file', () => {
      before(async () => {
        // delete .kibana index and then wait for Kibana to re-create it
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
        await esArchiver.load('management');
        await esArchiver.load('saved_objects/logstash');
        await esArchiver.load('saved_objects/logstash_kibana');
        await esArchiver.load('saved_objects/shakespeare_kibana');
        await esArchiver.load('getting_started/shakespeare');
      });

      // after(async () => {
      //   //await esArchiver.unload('management');
      // });

      // Test to import saved objects from 7.0.0 to 8.0.0 for time series data (logstash data)
      it('should import saved objects and associate it with logstash index pattern', async function() {
        // before(async () => {
        //   // delete .kibana index and then wait for Kibana to re-create it
        //   await esArchiver.load('saved_objects/logstash');
        //   await esArchiver.load('saved_objects/logstash_kibana');
        // });
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_logstash_700.json')
        );
        await PageObjects.settings.checkImportConflictsWarning();
        await PageObjects.settings.associateIndexPattern(
          'be57d2c0-1d2a-11ea-91c2-e59df2cc509e',
          'logstash-*'
        );
        await PageObjects.settings.clickConfirmChanges();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        // after(async () => {
        //   await esArchiver.unload('saved_objects/logstash');
        //   await esArchiver.unload('saved_objects/logstash_kibana');
        // });
      });

      // Test to import saved objects from 7.0.0 to 8.0.0 for non-time series data (shakespeare data)
      it('should import saved objects and associate it with logstash index pattern', async function() {
        // before(async () => {
        //   await esArchiver.load('saved_objects/shakespeare_kibana');
        //   await esArchiver.load('getting_started/shakespeare');
        // });
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_shakespeare_700.json')
        );
        await PageObjects.settings.checkImportConflictsWarning();
        await PageObjects.settings.associateIndexPattern(
          'c6288e40-1d2a-11ea-91c2-e59df2cc509e',
          'shakespeare'
        );
        await PageObjects.settings.clickConfirmChanges();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        // after(async () => {
        //   await esArchiver.unload('saved_objects/shakespeare_kibana');
        //   await esArchiver.unload('getting_started/shakespeare');
        // });
      });
    });
  });
}
