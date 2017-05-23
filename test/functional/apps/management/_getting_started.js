import expect from 'expect.js';

export default ({ getService, getPageObjects }) => {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const log = getService('log');

  const PageObjects = getPageObjects(['common', 'gettingStarted']);

  describe('Getting Started page', () => {
    describe('when no index patterns exist', () => {
      beforeEach(async () => {
        // delete .kibana index and then wait for Kibana to re-create it
        await esArchiver.unload('logstash_functional');
        await esArchiver.load('empty_kibana');
      });

      describe('when user has not opted out of Getting Started page', () => {
        beforeEach(async () => {
          // First, we navigate to *somewhere* in Kibana so the browser loads up Kibana. This allows us...
          await PageObjects.common.navigateToUrl('discover', '');

          // ... to remove the Getting Started page opt-out flag from local storage for the Kibana domain
          await remote.deleteLocalStorageItem('kibana.isGettingStartedOptedOut');
        });

        it('redirects to the Getting Started page', async () => {
          await PageObjects.common.navigateToUrl('discover', '');
          await PageObjects.common.waitUntilUrlIncludes('getting_started');
          const isLoaded = await PageObjects.gettingStarted.doesContainerExist();
          expect(isLoaded).to.be(true);
        });
      });

      describe('when user has opted out of Getting Started page', () => {
        beforeEach(async () => {
          await PageObjects.gettingStarted.optOut();
        });

        it('does not redirect to the Getting Started page', async () => {
          await PageObjects.common.navigateToUrl('discover', '');
          const isLoaded = await PageObjects.gettingStarted.doesContainerExist();
          expect(isLoaded).to.be(false);
        });
      });

    });

    describe('when index patterns exist', () => {
      beforeEach(async () => {
        log.debug('load kibana index with default index pattern');
        await esArchiver.load('discover');
        await kibanaServer.uiSettings.replace({
          'dateFormat:tz':'UTC',
          'defaultIndex':'logstash-*'
        });
      });

      it('does not redirect to the Getting Started page', async () => {
        await PageObjects.common.navigateToUrl('discover', '');
        const isLoaded = await PageObjects.gettingStarted.doesContainerExist();
        expect(isLoaded).to.be(false);
      });

      describe('when a user directly navigates to the Getting Started page', () => {
        beforeEach(async () => {
          await PageObjects.gettingStarted.navigateTo();
        });

        it('the kibana chrome (which contains the global nav) is visible', async () => {
          const isChromeVisible = await PageObjects.common.isChromeVisible();
          expect(isChromeVisible).to.be(true);
        });
      });
    });
  });
};