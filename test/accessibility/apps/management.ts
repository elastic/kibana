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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const a11y = getService('a11y');

  // describe('Management', () => {
  //   before(async () => {
  //     await esArchiver.loadIfNeeded('logstash_functional');
  //     await kibanaServer.uiSettings.update({
  //       defaultIndex: 'logstash-*',
  //     });
  //     await PageObjects.common.navigateToApp('settings');
  //   });

  describe('Management', () => {
    before(async () => {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.settings.navigateTo();
    });

    it('main view', async () => {
      await a11y.testAppSnapshot();
    });

    it('index pattern page', async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      await a11y.testAppSnapshot();
    });

    it('Single indexpattern view', async () => {
      await PageObjects.settings.clickIndexPatternLogstash();
      await a11y.testAppSnapshot();
    });

    it('Create Index pattern wizard', async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      await (await testSubjects.find('createIndexPatternButton')).click();
      await a11y.testAppSnapshot();
    });

    // index patterns page
    it('Navigate back to logstash index page', async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await a11y.testAppSnapshot();
    });

    // Issue: https://github.com/elastic/kibana/issues/60030
    it.skip('Edit field type', async () => {
      await PageObjects.settings.clickEditFieldFormat();
      await a11y.testAppSnapshot();
    });

    it('Advanced settings', async () => {
      await PageObjects.settings.clickKibanaSettings();
      await a11y.testAppSnapshot();
    });
  });
}
