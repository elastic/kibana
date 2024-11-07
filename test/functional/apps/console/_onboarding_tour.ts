/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');

  describe('console onboarding tour', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    beforeEach(async () => {
      await browser.clearLocalStorage();
      await browser.refresh();
    });

    const isTourStepOpen = async (tourStepDataSubj: string) => {
      const classAttribute = await testSubjects.getAttribute(tourStepDataSubj, 'class');
      return classAttribute?.includes('euiPopover-isOpen');
    };

    const expectAllStepsHidden = async () => {
      expect(await isTourStepOpen('shellTourStep')).to.be(false);
      expect(await isTourStepOpen('editorTourStep')).to.be(false);
      expect(await isTourStepOpen('historyTourStep')).to.be(false);
      expect(await isTourStepOpen('configTourStep')).to.be(false);
      expect(await isTourStepOpen('filesTourStep')).to.be(false);
    };

    it('displays all five steps in the tour', async () => {
      log.debug('on Shell tour step');
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep();

      log.debug('on Editor tour step');
      expect(await isTourStepOpen('editorTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep();

      log.debug('on History tour step');
      expect(await isTourStepOpen('historyTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep();

      log.debug('on Config tour step');
      expect(await isTourStepOpen('configTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep();

      log.debug('on Files tour step');
      expect(await isTourStepOpen('filesTourStep')).to.be(true);
      // Last tour step should contain the "Complete" button
      expect(await testSubjects.exists('consoleCompleteTourButton')).to.be(true);
      await PageObjects.console.clickCompleteTour();

      // All steps should now be hidden
      await expectAllStepsHidden();

      // Tour should not show after refreshing the browser
      await browser.refresh();
      await expectAllStepsHidden();

      // Tour should reset after clearing local storage
      await browser.clearLocalStorage();
      await browser.refresh();
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
    });

    it('skipping the tour hides the tour steps', async () => {
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
      expect(await testSubjects.exists('consoleSkipTourButton')).to.be(true);
      await PageObjects.console.clickSkipTour();

      // All steps should now be hidden
      await expectAllStepsHidden();

      // Tour should not show after refreshing the browser
      await browser.refresh();
      await expectAllStepsHidden();
    });

    it('allows re-running the tour', async () => {
      await PageObjects.console.skipTourIfExists();

      // Verify that tour is hiddern
      await expectAllStepsHidden();

      // Re-run tour
      await PageObjects.console.clickHelpIcon();
      await PageObjects.console.clickRerunTour();

      // Verify that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
    });
  });
}
