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
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const security = getService('security');
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'unifiedFieldList']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover filter editor', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'version_test', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      log.debug('discover filter editor');
      await PageObjects.common.navigateToApp('discover');
    });

    describe('filter editor', function () {
      it('should add a phrases filter', async function () {
        await filterBar.addFilter({
          field: 'extension.raw',
          operation: 'is one of',
          value: ['jpg'],
        });
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
      });

      it('should show the phrases if you re-open a phrases filter', async function () {
        await filterBar.clickEditFilter('extension.raw', 'jpg');
        const phrases = await filterBar.getFilterEditorSelectedPhrases();
        expect(phrases.length).to.be(1);
        expect(phrases[0]).to.be('jpg');
        await filterBar.ensureFieldEditorModalIsClosed();
      });

      it('should support filtering on nested fields', async () => {
        await filterBar.addFilter({
          field: 'nestedField.child',
          operation: 'is',
          value: 'nestedValue',
        });
        expect(await filterBar.hasFilter('nestedField.child', 'nestedValue')).to.be(true);
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
      });

      describe('version fields', async () => {
        const es = getService('es');
        const indexPatterns = getService('indexPatterns');
        const indexTitle = 'version-test';

        before(async () => {
          if (await es.indices.exists({ index: indexTitle })) {
            await es.indices.delete({ index: indexTitle });
          }

          await es.indices.create({
            index: indexTitle,
            body: {
              mappings: {
                properties: {
                  version: {
                    type: 'version',
                  },
                },
              },
            },
          });

          await es.index({
            index: indexTitle,
            body: {
              version: '1.0.0',
            },
            refresh: 'wait_for',
          });

          await es.index({
            index: indexTitle,
            body: {
              version: '2.0.0',
            },
            refresh: 'wait_for',
          });

          await indexPatterns.create({ title: indexTitle }, { override: true });

          await PageObjects.common.navigateToApp('discover');
          await PageObjects.discover.selectIndexPattern(indexTitle);
        });

        it('should support range filter on version fields', async () => {
          await filterBar.addFilter({
            field: 'version',
            operation: 'is between',
            value: { from: '2.0.0', to: '3.0.0' },
          });
          expect(await filterBar.hasFilter('version', '2.0.0 to 3.0.0')).to.be(true);
          await retry.try(async function () {
            expect(await PageObjects.discover.getHitCount()).to.be('1');
          });
        });
      });

      const runFilterTest = async (pinned = false) => {
        await filterBar.removeAllFilters();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
        await retry.try(async function () {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          expect(await cell.getVisibleText()).to.be('jpg');
          expect(await PageObjects.discover.getHitCount()).to.be('14,004');
        });
        await filterBar.addFilter({
          field: 'extension.raw',
          operation: 'is',
          value: 'css',
        });
        if (pinned) {
          await filterBar.toggleFilterPinned('extension.raw');
        }
        await retry.try(async function () {
          expect(await filterBar.hasFilter('extension.raw', 'css', true, pinned)).to.be(true);
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          expect(await cell.getVisibleText()).to.be('css');
          expect(await PageObjects.discover.getHitCount()).to.be('2,159');
        });
        await browser.refresh();
        await retry.try(async function () {
          expect(await filterBar.hasFilter('extension.raw', 'css', true, pinned)).to.be(true);
          expect(await PageObjects.discover.getHitCount()).to.be('2,159');
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          expect(await cell.getVisibleText()).to.be('css');
        });
      };

      it('should support app filters in histogram/total hits and data grid', async function () {
        await runFilterTest();
      });

      it('should support pinned filters in histogram/total hits and data grid', async function () {
        await runFilterTest(true);
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await PageObjects.common.unsetTime();
    });
  });
}
