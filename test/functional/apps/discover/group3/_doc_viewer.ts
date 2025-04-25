/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'header']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');

  describe('discover doc viewer', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        hideAnnouncements: true,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('search', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();
      });

      it('should be able to search by string', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('geo');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await PageObjects.discover.findFieldByNameInDocViewer('.s');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search by wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent*image');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search with spaces as wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent image');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });
      });

      it('should ignore empty search', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await retry.waitFor('all items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });
    });

    describe('flyout', () => {
      let originalScreenSize = { width: 0, height: 0 };

      const reduceScreenWidth = async () => {
        await browser.setWindowSize(800, originalScreenSize.height);
      };

      const restoreScreenWidth = async () => {
        await browser.setWindowSize(originalScreenSize.width, originalScreenSize.height);
      };

      before(async () => {
        originalScreenSize = await browser.getWindowSize();
      });

      beforeEach(async () => {
        // open the flyout once initially to ensure table is the default tab
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await dataGrid.closeFlyout();
      });

      afterEach(async () => {
        await restoreScreenWidth();
      });

      describe('keyboard navigation', () => {
        it('should navigate between documents with arrow keys', async () => {
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
          await browser.pressKeys(browser.keys.ARROW_LEFT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.ARROW_LEFT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
        });

        it('should not navigate between documents with arrow keys when the search input is focused', async () => {
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await testSubjects.click('unifiedDocViewerFieldsSearchInput');
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
        });

        it('should not navigate between documents with arrow keys when the data grid is focused', async () => {
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await testSubjects.click('dataGridHeaderCell-name');
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
        });

        it('should close the flyout with the escape key', async () => {
          await dataGrid.clickRowToggle();
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(true);
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(false);
        });

        it('should close the flyout with the escape key when the search input is focused', async () => {
          await dataGrid.clickRowToggle();
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(true);
          await testSubjects.click('unifiedDocViewerFieldsSearchInput');
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(false);
        });

        it('should not close the flyout with the escape key when the data grid is focused', async () => {
          await dataGrid.clickRowToggle();
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(true);
          await testSubjects.click('dataGridHeaderCell-name');
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(true);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await PageObjects.discover.isShowingDocViewer()).to.be(false);
        });
      });

      describe('accessibility', () => {
        it('should focus the flyout on open, and retain focus when resizing between push and overlay flyouts', async () => {
          // push -> overlay -> push
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          let activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await reduceScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await restoreScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          // overlay -> push -> overlay
          await browser.pressKeys(browser.keys.ESCAPE);
          await reduceScreenWidth();
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await restoreScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await reduceScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
        });

        it('should return focus to the trigger element when the flyout is closed', async () => {
          // push
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await browser.pressKeys(browser.keys.ESCAPE);
          let activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // push -> overlay
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await reduceScreenWidth();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // overlay
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // overlay -> push
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await restoreScreenWidth();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
        });

        it('should show custom screen reader description push flyout is active', async () => {
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await testSubjects.existOrFail('unifiedDocViewerScreenReaderDescription', {
            allowHidden: true,
          });
        });

        it('should not show custom screen reader description when overlay flyout active', async () => {
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          await reduceScreenWidth();
          expect(
            await testSubjects.exists('unifiedDocViewerScreenReaderDescription', {
              allowHidden: true,
            })
          ).to.be(false);
        });

        it('should use expected a11y attributes', async () => {
          // push flyout
          await dataGrid.clickRowToggle();
          await PageObjects.discover.isShowingDocViewer();
          let role = await testSubjects.getAttribute('docViewerFlyout', 'role');
          let tabindex = await testSubjects.getAttribute('docViewerFlyout', 'tabindex');
          let describedBy = await testSubjects.getAttribute('docViewerFlyout', 'aria-describedby');
          let noFocusLock = await testSubjects.getAttribute(
            'docViewerFlyout',
            'data-no-focus-lock'
          );
          expect(role).to.be('dialog');
          expect(tabindex).to.be('0');
          expect(await find.existsByCssSelector(`#${describedBy}`)).to.be(true);
          expect(noFocusLock).to.be('true');
          // overlay flyout
          await reduceScreenWidth();
          role = await testSubjects.getAttribute('docViewerFlyout', 'role');
          tabindex = await testSubjects.getAttribute('docViewerFlyout', 'tabindex');
          describedBy = await testSubjects.getAttribute('docViewerFlyout', 'aria-describedby');
          noFocusLock = await testSubjects.getAttribute('docViewerFlyout', 'data-no-focus-lock');
          expect(role).to.be('dialog');
          expect(tabindex).to.be('0');
          expect(await find.existsByCssSelector(`#${describedBy}`)).to.be(true);
          expect(noFocusLock).to.be(null);
        });
      });
    });
  });
}
