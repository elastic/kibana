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

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings']);

  const testSubjects = getService('testSubjects');
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Saved objects', () => {
    before(async () => {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('settings');
    });

    it('Saved objects view', async () => {
      await PageObjects.settings.clickKibanaSavedObjects();
      await a11y.testAppSnapshot();
    });

    it('Click import button', async () => {
      await PageObjects.settings.clickImportButton();
      await a11y.testAppSnapshot();
    });

    it('Cancel import button', async () => {
      await PageObjects.settings.closeDialogButton();
      await a11y.testAppSnapshot();
    });

    it('Click search bar', async () => {
      await PageObjects.settings.clickSavedSearchBar();
      await a11y.testAppSnapshot();
    });

    // it('Search for a saved search in saved objects table', async () => {
    //
    //   await a11y.testAppSnapshot();
    // });
    //
    // it('View relationships on saved search', async () => {
    //   await PageObjects.settings.clickRelationships();
    //   await a11y.testAppSnapshot();
    // });
    //
    // it('Close relationships page', async () => {
    //   await PageObjects.settings.clickRelationships();
    //   await a11y.testAppSnapshot();
    // });
    //
    // it('Clear search item from searches on saved object table', async () => {
    //   //await PageObjects.settings.clickIndexPatternLogstash();
    //   await PageObjects.settings.clickRelationships();
    //   await a11y.testAppSnapshot();
    // });

    it('Click export all button', async () => {
      await PageObjects.settings.clickExportButton();
      await a11y.testAppSnapshot();
    });

    // it('Close export all button', async () => {
    //           await PageObjects.settings.clickExportButton();
    //           await a11y.testAppSnapshot();
    // });

    it('Inspect a saved object', async () => {
      // await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickRelationships();
      await a11y.testAppSnapshot();
    });

    it('Close the inspect page', async () => {
      // await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickRelationships();
      await a11y.testAppSnapshot();
    });

    // it('Delete saved search', async () => {
    //   await PageObjects.settings.clickRelationships();
    //   await a11y.testAppSnapshot();
    // });
  });
}
