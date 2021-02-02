/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const PageObjects = getPageObjects(['visualize']);

  describe('experimental visualizations in visualize app ', function () {
    describe('experimental visualizations', () => {
      beforeEach(async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
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
        const info = await PageObjects.visualize.getExperimentalInfo();
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
}
