/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['dashboard', 'common']);
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const screenshot = getService('screenshots');
  const log = getService('log');

  describe('embed mode', () => {
    /*
     * Note: The baseline images used in all of the screenshot tests in this test suite were taken directly from the CI environment
     * in order to overcome a known issue with the pixel density of fonts being significantly different when running locally versus
     * when running these tests as part of CI.
     *
     * This was done so that the screenshot tests can pass during CI; however, as a consequence, they may fail locally. Be careful
     * when running this test suite with the --updateBaselines flag.
     */

    const urlParamExtensions = [
      'show-top-menu=true',
      'show-query-input=true',
      'show-time-filter=true',
      'hide-filter-bar=true',
    ];

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('dashboard with everything');

      await browser.setWindowSize(1300, 900);
    });

    describe('default URL params', () => {
      it('hides the chrome', async () => {
        const globalNavShown = await globalNav.exists();
        expect(globalNavShown).to.be(true);

        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl + '&embed=true';
        // Embed parameter only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await retry.try(async () => {
          const globalNavHidden = !(await globalNav.exists());
          expect(globalNavHidden).to.be(true);
        });
      });

      it('expected elements are rendered and/or hidden', async () => {
        await testSubjects.missingOrFail('top-nav');
        await testSubjects.missingOrFail('queryInput');
        await testSubjects.missingOrFail('superDatePickerToggleQuickMenuButton');
        await testSubjects.existOrFail('globalQueryBar');
      });

      it('renders as expected', async () => {
        await PageObjects.dashboard.waitForRenderComplete();
        const percentDifference = await screenshot.compareAgainstBaseline(
          'dashboard_embed_mode',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });

    describe('non-default URL params', () => {
      it('shows or hides elements based on URL params', async () => {
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = [currentUrl].concat([...urlParamExtensions, 'embed=true']).join('&');
        // Embed parameter only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await testSubjects.existOrFail('top-nav');
        await testSubjects.existOrFail('queryInput');
        await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
      });

      it('renders as expected', async () => {
        await PageObjects.dashboard.waitForRenderComplete();
        const percentDifference = await screenshot.compareAgainstBaseline(
          'dashboard_embed_mode_with_url_params',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });

      it('renders as expected when scrolling', async () => {
        const panels = await PageObjects.dashboard.getDashboardPanels();
        const lastPanel = panels[panels.length - 1];
        const lastPanelHeight = -parseInt(await lastPanel.getComputedStyle('height'), 10);
        log.debug(
          `scrolling to panel ${await lastPanel.getAttribute(
            'data-test-embeddable-id'
          )} with offset ${lastPanelHeight}...`
        );
        await lastPanel.scrollIntoViewIfNecessary(lastPanelHeight);
        const percentDifference = await screenshot.compareAgainstBaseline(
          'dashboard_embed_mode_scrolling',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });

    after(async function () {
      const currentUrl = await browser.getCurrentUrl();
      const replaceParams = ['', 'embed=true'].concat(urlParamExtensions).join('&');
      const newUrl = currentUrl.replace(replaceParams, '');
      // First use the timestamp to cause a hard refresh so the new embed parameter works correctly.
      let useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);
      // Then get rid of the timestamp so the rest of the tests work with state and app switching.
      useTimeStamp = false;
      await browser.get(newUrl.toString(), useTimeStamp);
      await kibanaServer.savedObjects.cleanStandardList();
    });
  });
}
