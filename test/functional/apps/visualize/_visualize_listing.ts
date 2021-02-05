/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'visEditor']);
  const listingTable = getService('listingTable');

  // FLAKY: https://github.com/elastic/kibana/issues/40912
  describe.skip('visualize listing page', function describeIndexTests() {
    const vizName = 'Visualize Listing Test';

    describe('create and delete', function () {
      before(async function () {
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
        await PageObjects.visualize.gotoVisualizationLandingPage();
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
  });
}
