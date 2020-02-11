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

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['visualize', 'visEditor']);
  const listingTable = getService('listingTable');

  // FLAKY: https://github.com/elastic/kibana/issues/40912
  describe.skip('visualize listing page', function describeIndexTests() {
    const vizName = 'Visualize Listing Test';

    describe('create and delete', function() {
      before(async function() {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.deleteAllVisualizations();
      });

      it('create new viz', async function() {
        // type markdown is used for simplicity
        await PageObjects.visualize.createSimpleMarkdownViz(vizName);
        await PageObjects.visualize.gotoVisualizationLandingPage();
        const visCount = await listingTable.getItemsCount('visualize');
        expect(visCount).to.equal(1);
      });

      it('delete all viz', async function() {
        await PageObjects.visualize.createSimpleMarkdownViz(vizName + '1');
        await PageObjects.visualize.createSimpleMarkdownViz(vizName + '2');
        await PageObjects.visualize.gotoVisualizationLandingPage();

        let visCount = await listingTable.getItemsCount('visualize');
        expect(visCount).to.equal(3);

        await PageObjects.visualize.deleteAllVisualizations();
        visCount = await listingTable.getItemsCount('visualize');
        expect(visCount).to.equal(0);
      });
    });

    describe('search', function() {
      before(async function() {
        // create one new viz
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('HELLO');
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualization('Hello World');
        await PageObjects.visualize.gotoVisualizationLandingPage();
      });

      it('matches on the first word', async function() {
        await listingTable.searchForItemWithName('Hello');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(1);
      });

      it('matches the second word', async function() {
        await listingTable.searchForItemWithName('World');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(1);
      });

      it('matches the second word prefix', async function() {
        await listingTable.searchForItemWithName('Wor');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(1);
      });

      it('does not match mid word', async function() {
        await listingTable.searchForItemWithName('orld');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(0);
      });

      it('is case insensitive', async function() {
        await listingTable.searchForItemWithName('hello world');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(1);
      });

      it('is using AND operator', async function() {
        await listingTable.searchForItemWithName('hello banana');
        const itemCount = await listingTable.getItemsCount('visualize');
        expect(itemCount).to.equal(0);
      });
    });
  });
}
