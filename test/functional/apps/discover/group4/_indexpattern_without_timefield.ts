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
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'header']);

  describe('indexpattern without timefield', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_timefield']);
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'without-timefield',
        'timepicker:timeDefaults': '{  "from": "2019-01-18T19:37:13.000Z",  "to": "now"}',
      });
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
      await kibanaServer.uiSettings.unset('defaultIndex');
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('should not display a timepicker', async () => {
      if (await PageObjects.timePicker.timePickerExists()) {
        throw new Error('Expected timepicker not to exist');
      }
    });

    it('should adapt sidebar fields when switching', async () => {
      await PageObjects.discover.selectIndexPattern('with-timefield');
      const timefieldExistsWithTimefield = await testSubjects.exists('field-@timestamp');
      expect(timefieldExistsWithTimefield).to.be(true);
      await PageObjects.discover.selectIndexPattern('without-timefield');
      await PageObjects.discover.waitForDocTableLoadingComplete();
      const timefieldExistsWithoutTimefield = await testSubjects.exists('field-@timestamp');
      expect(timefieldExistsWithoutTimefield).to.be(false);
    });

    it('should display a timepicker after switching to an index pattern with timefield', async () => {
      await PageObjects.discover.selectIndexPattern('with-timefield');
      await PageObjects.discover.waitForDocTableLoadingComplete();
      if (!(await PageObjects.timePicker.timePickerExists())) {
        throw new Error('Expected timepicker to exist');
      }
    });
    it('should switch between with and without timefield using the browser back button', async () => {
      await PageObjects.discover.selectIndexPattern('without-timefield');
      await PageObjects.discover.waitForDocTableLoadingComplete();
      await retry.waitForWithTimeout(
        'The timepicker not to exist',
        5000,
        async () => !(await PageObjects.timePicker.timePickerExists())
      );

      await PageObjects.discover.selectIndexPattern('with-timefield');
      await PageObjects.discover.waitForDocTableLoadingComplete();
      await retry.waitForWithTimeout(
        'The timepicker to exist',
        5000,
        async () => await PageObjects.timePicker.timePickerExists()
      );
      await retry.waitForWithTimeout(
        'index pattern to have been switched back to "without-timefield"',
        5000,
        async () => {
          // Navigating back
          await browser.goBack();
          await PageObjects.discover.waitForDocTableLoadingComplete();
          return (
            (await testSubjects.getVisibleText('discover-dataView-switch-link')) ===
            'without-timefield'
          );
        }
      );

      await retry.waitForWithTimeout(
        'The timepicker not to exist',
        5000,
        async () => !(await PageObjects.timePicker.timePickerExists())
      );
    });

    it('should disable the auto refresh interval when switching to a data view without a time field', async () => {
      const autoRefreshInterval = 5;
      await PageObjects.discover.selectIndexPattern('with-timefield');
      await PageObjects.timePicker.startAutoRefresh(autoRefreshInterval);
      let url = await browser.getCurrentUrl();
      expect(url).to.contain(`refreshInterval:(pause:!f,value:${autoRefreshInterval * 1000})`);
      await PageObjects.discover.selectIndexPattern('without-timefield');
      url = await browser.getCurrentUrl();
      expect(url).to.contain(`refreshInterval:(pause:!t,value:${autoRefreshInterval * 1000})`);
    });

    it('should allow switching from a saved search with a time field to a saved search without a time field', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('with-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.saveSearch('with-timefield');
      await PageObjects.discover.selectIndexPattern('without-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.saveSearch('without-timefield', true);
      await PageObjects.discover.loadSavedSearch('with-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.loadSavedSearch('without-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.assertHitCount('1');
    });

    it('should allow switching from data views with different timefields and sort correctly', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('with-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      let url = await browser.getCurrentUrl();
      expect(url).to.contain(`@timestamp`);

      await PageObjects.discover.selectIndexPattern('with-different-timefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      url = await browser.getCurrentUrl();
      expect(url).to.contain(`with-different-timefield`);
      await browser.goBack();
      await PageObjects.header.waitUntilLoadingHasFinished();
      url = await browser.getCurrentUrl();
      expect(url).to.contain(`@timestamp`);
    });
  });
}
