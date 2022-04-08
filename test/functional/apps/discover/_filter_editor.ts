/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'header']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover filter editor', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover filter editor');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('filter editor', function () {
      it('should add a phrases filter', async function () {
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
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
        await filterBar.addFilter('nestedField.child', 'is', 'nestedValue');
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
          await PageObjects.header.waitUntilLoadingHasFinished();
          await filterBar.addFilter('version', 'is between', '2.0.0', '3.0.0');
          expect(await filterBar.hasFilter('version', '2.0.0 to 3.0.0')).to.be(true);
          await retry.try(async function () {
            expect(await PageObjects.discover.getHitCount()).to.be('1');
          });
        });
      });
    });
  });
}
