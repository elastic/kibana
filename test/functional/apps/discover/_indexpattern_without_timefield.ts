/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('indexpattern without timefield', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_timefield']);
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
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
      if (!(await PageObjects.timePicker.timePickerExists())) {
        throw new Error('Expected timepicker to exist');
      }
    });
    it('should switch between with and without timefield using the browser back button', async () => {
      await PageObjects.discover.selectIndexPattern('without-timefield');
      if (await PageObjects.timePicker.timePickerExists()) {
        throw new Error('Expected timepicker not to exist');
      }

      await PageObjects.discover.selectIndexPattern('with-timefield');
      if (!(await PageObjects.timePicker.timePickerExists())) {
        throw new Error('Expected timepicker to exist');
      }
      // Navigating back to discover
      await browser.goBack();
      if (await PageObjects.timePicker.timePickerExists()) {
        throw new Error('Expected timepicker not to exist');
      }
    });
  });
}
