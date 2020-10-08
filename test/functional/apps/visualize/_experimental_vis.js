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

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const PageObjects = getPageObjects(['visualize']);

  describe('experimental visualizations in visualize app ', function () {
    describe('experimental visualizations', () => {
      beforeEach(async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.waitForVisualizationSelectPage();
      });

      it('should show an notification when creating beta visualizations', async () => {
        // Try to find a beta visualization.
        const betaTypes = await PageObjects.visualize.getBetaTypeLinks();
        if (betaTypes.length === 0) {
          log.info('No beta visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await betaTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await PageObjects.visualize.selectVisSourceIfRequired();
        // Check that the beta banner is there and state that this is beta
        const info = await PageObjects.visualize.getBetaInfo();
        expect(await info.getVisibleText()).to.contain('beta');
      });

      it('should show an notification when creating experimental visualizations', async () => {
        // Try to find a experimental visualization.
        const experimentalTypes = await PageObjects.visualize.getExperimentalTypeLinks();
        if (experimentalTypes.length === 0) {
          log.info('No experimental visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await experimentalTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await PageObjects.visualize.selectVisSourceIfRequired();
        // Check that the experimental banner is there and state that this is experimental
        const info = await PageObjects.visualize.getExperimentalInfo();
        expect(await info.getVisibleText()).to.contain('experimental');
      });

      it('should not show that notification for stable visualizations', async () => {
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        expect(await PageObjects.visualize.isBetaInfoShown()).to.be(false);
        expect(await PageObjects.visualize.isExperimentalInfoShown()).to.be(false);
      });
    });
  });
};
