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
  const { visualize, visualBuilder } = getPageObjects(['visualize', 'visualBuilder']);
  const listingTable = getService('listingTable');

  describe('visualize listing page', function describeIndexTests() {
    const vizName = 'Visualize Listing Test';

    describe('create and delete', function () {
      before(async function () {
        await visualize.initTests();
        await visualize.gotoVisualizationLandingPage();
        await visualize.deleteAllVisualizations();
      });

      it('create new viz', async function () {
        // type tsvb is used for simplicity
        await visualize.createSimpleTSVBViz(vizName);
        await visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 1);
      });

      it('delete all viz', async function () {
        await visualize.createSimpleTSVBViz(vizName + '1');
        await visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 2);

        await visualize.createSimpleTSVBViz(vizName + '2');
        await visualize.gotoVisualizationLandingPage();
        await listingTable.expectItemsCount('visualize', 3);

        await visualize.deleteAllVisualizations();
        await listingTable.expectItemsCount('visualize', 0);
      });
    });

    describe('search', function () {
      before(async function () {
        // create one new viz
        await visualize.navigateToNewVisualization();
        await visualize.clickVisualBuilder();
        await visualBuilder.checkVisualBuilderIsPresent();
        await visualize.saveVisualization('Hello World');
        await visualize.gotoVisualizationLandingPage();
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
        await visualize.gotoVisualizationLandingPage();
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
