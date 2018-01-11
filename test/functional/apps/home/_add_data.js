import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'home']);

  describe('add data tutorials', function describeIndexTests() {

    it('directory should display registered tutorials', async ()=> {
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const tutorialExists = await PageObjects.home.doesSynopsisExist('netflow');
        expect(tutorialExists).to.be(true);
      });
    });

  });
}
