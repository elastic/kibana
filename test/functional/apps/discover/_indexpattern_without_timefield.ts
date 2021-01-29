/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('indexpattern without timefield', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_timefield']);
      await esArchiver.loadIfNeeded('index_pattern_without_timefield');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'without-timefield' });
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('index_pattern_without_timefield');
    });

    it('should not display a timepicker', async () => {
      if (await PageObjects.timePicker.timePickerExists()) {
        throw new Error('Expected timepicker not to exist');
      }
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
