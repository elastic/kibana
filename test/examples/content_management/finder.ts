/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'home', 'header']);
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  describe('Finder demo', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
    });
    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    it('Finder demo works', async () => {
      const appId = 'contentManagementExamples';
      await PageObjects.common.navigateToApp(appId, {
        path: 'finder',
      });

      await testSubjects.existOrFail(`savedObjectsFinderTable`);
      await testSubjects.existOrFail(`savedObjectFinderTitle`);

      const titles: string[] = [];
      const titlesElements = await testSubjects.findAll(`savedObjectFinderTitle`);
      for (let i = 0; i < titlesElements.length; i++) {
        titles.push(await (await titlesElements[i].findByClassName(`euiLink`)).getVisibleText());
      }

      const expectExists = [
        `Kibana Sample Data Flights`,
        `[Flights] Airport Connections (Hover Over Airport)`,
        `[Flights] Departures Count Map`,
        `[Flights] Origin Time Delayed`,
        `[Flights] Flight Log`,
      ];

      expectExists.forEach((item) => {
        log.debug(`Checking for ${item}`);
        expect(titles.includes(item)).to.be(true);
      });
    });
  });
}
