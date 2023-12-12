/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('discover data grid tests', function describeDiscoverDataGrid() {
    const esArchiver = getService('esArchiver');
    const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'unifiedFieldList']);
    const kibanaServer = getService('kibanaServer');
    const defaultSettings = { defaultIndex: 'logstash-*' };
    const testSubjects = getService('testSubjects');
    const security = getService('security');
    const retry = getService('retry');
    const browser = getService('browser');

    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('can add fields to the table', async function () {
      const getTitles = async () =>
        (await testSubjects.getVisibleText('dataGridHeader')).replace(/\s|\r?\n|\r/g, ' ');

      expect(await getTitles()).to.be('@timestamp Document');

      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      expect(await getTitles()).to.be('@timestamp bytes');

      await PageObjects.unifiedFieldList.clickFieldListItemAdd('agent');
      expect(await getTitles()).to.be('@timestamp bytes agent');

      await PageObjects.unifiedFieldList.clickFieldListItemRemove('bytes');
      expect(await getTitles()).to.be('@timestamp agent');

      await PageObjects.unifiedFieldList.clickFieldListItemRemove('agent');
      expect(await getTitles()).to.be('@timestamp Document');
    });

    const isVisible = async (selector: string) => {
      const element = await testSubjects.find(selector);
      const { x, y, width, height } = await element.getPosition();
      return browser.execute(
        (innerSelector, innerX, innerY) => {
          let currentElement = document.elementFromPoint(innerX, innerY);
          while (currentElement) {
            if (currentElement.matches(`[data-test-subj="${innerSelector}"]`)) {
              return true;
            }
            currentElement = currentElement.parentElement;
          }
          return false;
        },
        selector,
        x + width / 2,
        y + height / 2
      );
    };

    it('should hide elements beneath the table when in full screen mode regardless of their z-index', async () => {
      await retry.try(async () => {
        expect(await isVisible('unifiedHistogramQueryHits')).to.be(true);
        expect(await isVisible('unifiedHistogramResizableButton')).to.be(true);
      });
      await testSubjects.click('dataGridFullScreenButton');
      await retry.try(async () => {
        expect(await isVisible('unifiedHistogramQueryHits')).to.be(false);
        expect(await isVisible('unifiedHistogramResizableButton')).to.be(false);
      });
      await testSubjects.click('dataGridFullScreenButton');
      await retry.try(async () => {
        expect(await isVisible('unifiedHistogramQueryHits')).to.be(true);
        expect(await isVisible('unifiedHistogramResizableButton')).to.be(true);
      });
    });

    it('should show the the grid toolbar', async () => {
      await testSubjects.existOrFail('dscGridToolbar');
    });
  });
}
