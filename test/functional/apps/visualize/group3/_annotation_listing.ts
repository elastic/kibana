/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'annotationEditor']);
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');

  describe('annotation listing page', function () {
    before(async function () {
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/annotation_listing_page_search'
      );
      // we need to test the missing data view scenario, so delete one of them
      // (can't just omit it from the archive because Kibana won't import with broken references)
      log.info(`deleting one data view to replicate missing data view scenario...`);
      await kibanaServer.request({
        method: 'DELETE',
        path: `/api/data_views/data_view/data-view-to-delete`,
      });

      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.visualize.selectAnnotationsTab();
      await listingTable.waitUntilTableIsLoaded();
    });

    after(async function () {
      log.info(`unloading annotations and data views`);
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/annotation_listing_page_search'
      );
    });

    describe('search', function () {
      afterEach(async function () {
        await listingTable.clearSearchFilter();
      });

      describe('by text', () => {
        it('matches on the first word', async function () {
          await retry.try(async () => {
            await listingTable.searchForItemWithName('search');
            await listingTable.expectItemsCount('eventAnnotation', 1);
          });
        });

        it('matches the second word', async function () {
          await listingTable.searchForItemWithName('for');
          await listingTable.expectItemsCount('eventAnnotation', 1);
        });

        it('matches the second word prefix', async function () {
          await listingTable.searchForItemWithName('fo');
          await listingTable.expectItemsCount('eventAnnotation', 1);
        });

        it('does not match mid word', async function () {
          await listingTable.searchForItemWithName('earc');
          // custom timeout so this test moves faster
          await listingTable.expectItemsCount('eventAnnotation', 0, 1000);
        });

        it('is case insensitive', async function () {
          await listingTable.searchForItemWithName('SEARCH');
          await listingTable.expectItemsCount('eventAnnotation', 1);
        });

        it('is using AND operator', async function () {
          await listingTable.searchForItemWithName('search banana');
          // custom timeout so this test moves faster
          await listingTable.expectItemsCount('eventAnnotation', 0, 1000);
        });

        it('matches on description', async function () {
          await listingTable.searchForItemWithName('i have a description');
          await listingTable.expectItemsCount('eventAnnotation', 1);
        });
      });

      describe('by tag', () => {
        it('filters by tag', async () => {
          await listingTable.selectFilterTags('tag');
          await listingTable.expectItemsCount('eventAnnotation', 7);
        });
      });
    });

    describe('delete', function () {
      it('deletes some groups', async function () {
        await listingTable.deleteItem('to delete 1');
        await listingTable.deleteItem('to delete 2');
        await listingTable.searchForItemWithName('to delete');
        await listingTable.expectItemsCount('eventAnnotation', 0, 1000);
        await listingTable.clearSearchFilter();
      });
    });

    describe('edit', function () {
      it('edits group metadata', async function () {
        await listingTable.clickItemLink('eventAnnotation', 'group 3');
        await PageObjects.annotationEditor.editGroupMetadata({
          title: 'edited title',
          description: 'edited description',
        });
        await PageObjects.annotationEditor.saveGroup();

        await listingTable.searchForItemWithName('edited title');
        await listingTable.expectItemsCount('eventAnnotation', 1);

        await listingTable.searchForItemWithName('edited description');
        await listingTable.expectItemsCount('eventAnnotation', 1);
      });

      describe('individual annotations', () => {
        it('edits an existing annotation', async function () {
          await listingTable.clickItemLink('eventAnnotation', 'edited title');
          expect(await PageObjects.annotationEditor.getAnnotationCount()).to.be(1);

          await PageObjects.annotationEditor.openAnnotation();
          await PageObjects.annotationEditor.configureAnnotation({
            query: 'my query',
            lineThickness: 5,
            color: '#FF0000',
          });
        });

        it('adds a new annotation', async function () {
          await PageObjects.annotationEditor.addAnnotation({
            query: 'other query',
            lineThickness: 3,
            color: '#00FF00',
          });

          await retry.try(async () => {
            expect(await PageObjects.annotationEditor.getAnnotationCount()).to.be(2);
          });
        });

        it('removes an annotation', async function () {
          await PageObjects.annotationEditor.removeAnnotation();

          await retry.try(async () => {
            expect(await PageObjects.annotationEditor.getAnnotationCount()).to.be(1);
          });

          await PageObjects.annotationEditor.saveGroup();
        });
      });

      describe('data view switching', () => {
        before(async () => {
          await listingTable.clearSearchFilter();
        });

        it('recovers from missing data view', async () => {
          await listingTable.clickItemLink('eventAnnotation', 'missing data view');

          await retry.try(async () => {
            expect(await PageObjects.annotationEditor.showingMissingDataViewPrompt()).to.be(true);
          });

          await retry.try(async () => {
            await PageObjects.annotationEditor.editGroupMetadata({
              dataView: 'logs*',
            });
            expect(await PageObjects.annotationEditor.showingMissingDataViewPrompt()).to.be(false);
            expect(await find.byCssSelector('canvas')).to.be.ok();
          });

          await PageObjects.annotationEditor.saveGroup();
        });

        it('recovers from missing field in data view', async () => {
          const assertShowingMissingFieldError = async (yes: boolean) => {
            const [failureExists, canvasExists] = await Promise.all([
              testSubjects.exists('embeddable-lens-failure'),
              find.existsByCssSelector('canvas', 1000),
            ]);
            expect(failureExists).to.be(yes);
            expect(canvasExists).to.be(!yes);
          };

          await listingTable.clickItemLink('eventAnnotation', 'Group with additional fields');

          await assertShowingMissingFieldError(false);

          await retry.try(async () => {
            await PageObjects.annotationEditor.editGroupMetadata({
              dataView: 'Data view without fields',
            });

            await assertShowingMissingFieldError(true);
          });

          await retry.try(async () => {
            await PageObjects.annotationEditor.editGroupMetadata({
              dataView: 'logs*',
            });

            await assertShowingMissingFieldError(false);
          });
        });
      });
    });
  });
}
