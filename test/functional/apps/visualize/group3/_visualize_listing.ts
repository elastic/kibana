/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'visEditor']);
  const listingTable = getService('listingTable');

  describe('visualize listing page', function describeIndexTests() {
    const vizName = 'Visualize Listing Test';

    describe('create and delete', function () {
      before(async function () {
        await PageObjects.visualize.initTests();
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.deleteAllVisualizations();
      });

      it('create new viz', async function () {
        // type markdown is used for simplicity
        await PageObjects.visualize.createSimpleMarkdownViz(vizName);
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('delete all viz', async function () {
        await PageObjects.visualize.createSimpleMarkdownViz(vizName + '1');
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 2);

        await PageObjects.visualize.createSimpleMarkdownViz(vizName + '2');
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 3);

        await PageObjects.visualize.deleteAllVisualizations();
        await listingTable.expectItemsCount('visualize', 0);
      });
    });

    describe('search', function () {
      before(async function () {
        // create one new viz
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('HELLO');
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualization('Hello World');
        await PageObjects.visualize.gotoVisualizationLandingPage();
      });

      it('matches on the first word', async function () {
        await listingTable.searchForItemWithName('Hello');
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('matches the second word', async function () {
        await listingTable.searchForItemWithName('World');
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('matches the second word prefix', async function () {
        await listingTable.searchForItemWithName('Wor');
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('does not match mid word', async function () {
        await listingTable.searchForItemWithName('orld');
        await listingTable.expectItemsCount('visualize', 0);
      });

      it('is case insensitive', async function () {
        await listingTable.searchForItemWithName('hello world');
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('is using AND operator', async function () {
        await listingTable.searchForItemWithName('hello banana');
        await listingTable.expectItemsCount('visualize', 0);
      });
    });

    describe('Edit', () => {
      before(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
      });

      it('should edit the title and description of a visualization', async () => {
        await listingTable.searchForItemWithName('Hello');
        await listingTable.inspectVisualization();
        await listingTable.editVisualizationDetails({
          title: 'new title',
          description: 'new description',
        });
        await listingTable.searchForItemWithName('new title');
        await listingTable.expectItemsCount('visualize', 1);
      });
    });
  });
}
