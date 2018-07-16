import expect from 'expect.js';

import { AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';


export default function ({ getService, getPageObjects, updateBaselines }) {
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common']);
  const screenshot = getService('screenshots');
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  describe('dashboard snapshots', function describeIndexTests() {
    let initialSize;

    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await remote.setWindowSize(1000, 500);

      // can see from properties of baseline images
      // const baselineImageSize = { width: 2000, height: 772 };
      const baselineImageSize = { width: 1000, height: 386 };
      await calibrateForScreenshots(baselineImageSize);

    });


    /*
    Although the baseline images were captured with the window set to 1280 x 800
    the actual baseline images for this test are 1280 x 686 because Chrome has a
    banner at the top that says the browser is being controlled by automated
    software.  The comparePngs function will try to scale images of mismatched
    sizes before doing the comparison, but the matching is much more accurate if
    the images are in the exact same aspect ratio.
    To accomadate for different browsers on different OSs, we can take a temp
    screenshot, get it's size, and then adjust our window size so that the screenshots
    will be an exact match (if the user's display scaling is 100%).
    If the display scaling is not 100%, we need to figure out what it is and use
    that in our new window size calculation.  For example, If I run this test with
    my display scaling set to 200%, the comparePngs will log this;
      expected height 686 and width 1280
      actual height 1372 and width 2560
    But that's OK, because that's exactly 200% of the baseline image size.
    */
    async function calibrateForScreenshots(baselineImageSize) {
      // CALIBRATION STEP
      initialSize = await remote.getWindowSize();
      // take a sample screenshot and get the size
      let currentSize = await screenshot.getScreenshotSize();
      log.debug(`################## initial screenshot Size: ${currentSize.width} x ${currentSize.height}`);
      // determine if there is display scaling and if so, what it is
      log.debug(`current width / 1280 = ${currentSize.width / 1280}`);
      log.debug(`current width / 1252 = ${currentSize.width / 1252}`);

      await remote.setWindowSize(initialSize.width + 100, initialSize.height);
      const tempSize = await screenshot.getScreenshotSize();
      log.debug(`################ temp  screenshot Size: ${currentSize.width} x ${currentSize.height}`);
      const ratio = (tempSize.width - currentSize.width) / 100;
      log.debug(`################ display scaling ratio = ${ratio}`);

      // calculate the new desired size using that ratio.
      const newSize = { width: (initialSize.width) + (baselineImageSize.width) - currentSize.width / ratio,
        height: (initialSize.height) + (baselineImageSize.height)  - currentSize.height / ratio };
      log.debug(`################## setting window size to ${newSize.width} x ${newSize.height}`);
      log.debug(`################## delta size to ${newSize.width - initialSize.width} x ${newSize.height - initialSize.height}`);
      await remote.setWindowSize(newSize.width, newSize.height);

      // check again.
      currentSize = await screenshot.getScreenshotSize();
      log.debug(`################## second screenshot Size: ${currentSize.width} x ${currentSize.height}`);
    }


    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    // This one won't work because of https://github.com/elastic/kibana/issues/15501.  See if we can get it to work
    // once TSVB has timezone support.
    it.skip('compare TSVB snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await dashboardVisualizations.createAndAddTSVBVisualization('TSVB');
      await testSubjects.click('toastCloseButton');

      await PageObjects.dashboard.saveDashboard('tsvb');
      await testSubjects.click('saveDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.clickFullScreenMode();
      await PageObjects.dashboard.toggleExpandPanel();

      await PageObjects.dashboard.waitForRenderComplete();
      const percentSimilar = await screenshot.compareAgainstBaseline('tsvb_dashboard', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      expect(percentSimilar).to.be(0);
    });

    it('compare area chart snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.dashboard.addVisualizations([AREA_CHART_VIS_NAME]);
      await testSubjects.click('addVisualizationToDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.saveDashboard('area');
      await testSubjects.click('saveDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.clickFullScreenMode();
      await PageObjects.dashboard.toggleExpandPanel();

      await PageObjects.dashboard.waitForRenderComplete();
      // The need for this should have been removed with https://github.com/elastic/kibana/pull/15574 but the
      // test failed when removed because the visualization hadn't settled.
      await PageObjects.common.sleep(1000);

      const percentSimilar = await screenshot.compareAgainstBaseline('area_chart', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      // Testing some OS/browser differnces were shown to cause .009 percent difference.
      expect(percentSimilar).to.be.lessThan(0.05);
    });
  });
}
