import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'common']);
  const remote = getService('remote');

  describe('embed mode', async () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides the chrome', async () => {
      let isChromeVisible = await PageObjects.common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      const currentUrl = await remote.getCurrentUrl();
      const newUrl = currentUrl + '&embed=true';
      // Embed parameter only works on a hard refresh.
      const useTimeStamp = true;
      await remote.get(newUrl.toString(), useTimeStamp);

      await retry.try(async () => {
        isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(false);
      });
    });

    after(async function () {
      const currentUrl = await remote.getCurrentUrl();
      const newUrl = currentUrl.replace('&embed=true', '');
      // First use the timestamp to cause a hard refresh so the new embed parameter works correctly.
      let useTimeStamp = true;
      await remote.get(newUrl.toString(), useTimeStamp);
      // Then get rid of the timestamp so the rest of the tests work with state and app switching.
      useTimeStamp = false;
      await remote.get(newUrl.toString(), useTimeStamp);
    });
  });
}

