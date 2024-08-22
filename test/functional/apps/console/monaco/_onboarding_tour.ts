import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');

  describe('console onboarding tour', function describeIndexTests() {
    before(async () => {
      await browser.clearLocalStorage();
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    const expectAllStepsHidden = async () => {
      expect(await testSubjects.exists('shellTourStep')).to.be(false);
      expect(await testSubjects.exists('editorTourStep')).to.be(false);
      expect(await testSubjects.exists('historyTourStep')).to.be(false);
      expect(await testSubjects.exists('configTourStep')).to.be(false);
      expect(await testSubjects.exists('filesTourStep')).to.be(false);
    };

    it('displays all five steps in the tour', async () => {
      expect(await testSubjects.exists('shellTourStep')).to.be(true);
      await PageObjects.console.monaco.clickNextTourStep();

      expect(await testSubjects.exists('editorTourStep')).to.be(true);
      await PageObjects.console.monaco.clickNextTourStep();

      expect(await testSubjects.exists('historyTourStep')).to.be(true);
      await PageObjects.console.monaco.clickNextTourStep();

      expect(await testSubjects.exists('configTourStep')).to.be(true);
      await PageObjects.console.monaco.clickNextTourStep();

      expect(await testSubjects.exists('filesTourStep')).to.be(true);
      // Last tour step should contain the "Complete" button
      expect(await testSubjects.exists('consoleCompleteTourButton')).to.be(true);
      await PageObjects.console.monaco.clickCompleteTour();

      // All steps should now be hidden
      await expectAllStepsHidden();

      // Tour should not show after refreshing the browser
      await browser.refresh();
      await expectAllStepsHidden();

      // Tour should reset after clearing local storage
      await browser.clearLocalStorage();
      expect(await testSubjects.exists('shellTourStep')).to.be(true);
    });

    it('skipping the tour hides the tour steps', async () => {
      expect(await testSubjects.exists('shellTourStep')).to.be(true);
      expect(await testSubjects.exists('consoleSkipTourButton')).to.be(true);
      await PageObjects.console.monaco.clickSkipTour();

      // All steps should now be hidden
      await expectAllStepsHidden();

      // Tour should not show after refreshing the browser
      await browser.refresh();
      await expectAllStepsHidden();
    });
  });
}