/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('console settings', function testSettings() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.closeHelpIfExists();
      await PageObjects.console.clearTextArea();
    });

    it('displays the a11y overlay', async () => {
      await PageObjects.console.pressEscape();
      const isOverlayVisible = await PageObjects.console.isA11yOverlayVisible();
      expect(isOverlayVisible).to.be(true);
    });

    it('disables the a11y overlay via settings', async () => {
      await PageObjects.console.openSettings();
      await PageObjects.console.toggleA11yOverlaySetting();

      await PageObjects.console.pressEscape();
      const isOverlayVisible = await PageObjects.console.isA11yOverlayVisible();
      expect(isOverlayVisible).to.be(false);
    });
  });
}
