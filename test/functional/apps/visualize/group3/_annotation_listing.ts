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
  const retry = getService('retry');

  describe('annotation listing page', function () {
    before(async function () {
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/annotation_listing_page_search'
      );

      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.visualize.selectAnnotationsTab();
    });

    after(async function () {
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
          await listingTable.searchForItemWithName('search');
          await listingTable.expectItemsCount('eventAnnotation', 1);
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
      });
    });

    describe('edit', function () {
      it('edits group metadata', async function () {
        await listingTable.clickItemLink('eventAnnotation', 'group 3');
        PageObjects.annotationEditor.editGroupMetadata({
          title: 'edited title',
          description: 'edited description',
        });

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

          retry.try(async () => {
            expect(await PageObjects.annotationEditor.getAnnotationCount()).to.be(2);
          });
        });

        it('removes an annotation', async function () {
          await PageObjects.annotationEditor.removeAnnotation();

          await retry.try(async () => {
            expect(await PageObjects.annotationEditor.getAnnotationCount()).to.be(1);
          });
        });
      });

      describe('data view switching', () => {
        it('recovers from missing data view', () => {});
        it('recovers from missing field in data view', () => {});
      });
    });
  });
}
