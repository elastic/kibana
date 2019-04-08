/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects, updateBaselines }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const screenshot = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const browser = getService('browser');
  const find = getService('find');

  describe('visualize screenshots', function describeIndexTests() {
    let initialSize;
    let historyLog = '';
    const baseUrl = 'http://localhost:5620/app/kibana#/visualize/edit/';
    const urlQueryArgs =
      '?_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3A\''
      + '2015-09-19T06%3A31%3A44.000Z\'%2Cto%3A\'2015-09-23T18%3A31%3A44.000Z\'))';
    let screenshotCalibration = false;

    before(async function () {
      await esArchiver.load('visualization_screenshots');
      await PageObjects.common.navigateToApp('visualize');
      // await browser.setWindowSize(1280, 800);
      // await browser.setWindowSize(1264, 668);


      // can see from properties of baseline images (using just the visualization element)
      // const baselineImageSize = { width: 1216, height: 620 };
      // await calibrateForScreenshots(baselineImageSize);
    });

    after(async function () {
      browser.setWindowSize(initialSize.width, initialSize.height);
      log.info(historyLog);
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
      initialSize = await browser.getWindowSize();
      log.debug(`################## initial window Size: ${initialSize.width} x ${initialSize.height}`);
      // take a sample screenshot and get the size
      // let currentSize = await screenshot.getScreenshotSize(await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
      let currentSize = await screenshot.getScreenshotSize(await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
      log.debug(`################## initial screenshot Size: ${currentSize.width} x ${currentSize.height}`);
      if (currentSize.width === baselineImageSize.width && currentSize.height === baselineImageSize.height) {
        log.debug('currentSize = baselineImageSize');
      } else {
        // determine if there is display scaling and if so, what it is
        log.debug(`current screenshot width / 1280 = ${currentSize.width / 1280}`);
        log.debug(`current screenshot width / 1252 = ${currentSize.width / 1252}`);

        await browser.setWindowSize(400, 400);
        await browser.setWindowSize(initialSize.width + 100, initialSize.height);
        const tempSize = await screenshot.getScreenshotSize(await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
        log.debug(`################ temp  screenshot Size: ${tempSize.width} x ${tempSize.height}`);
        if (tempSize.width - currentSize.width > 0) {
          const ratio = Math.round((tempSize.width - currentSize.width) * 4 / 100) / 4;
          log.debug(`################ display scaling ratio = ${ratio}`);

          if (ratio !== 1) {
            log.error('capturing and comparing elements in Kibana will not work '
            + 'when the display scaling ratio is anything other than 100%');
          }

          // calculate the new desired size using that ratio.
          const newSize = { width: (initialSize.width) + (baselineImageSize.width) - currentSize.width / ratio,
            height: (initialSize.height) + (baselineImageSize.height)  - currentSize.height / ratio };
          log.debug(`################## setting window size to ${newSize.width} x ${newSize.height}`);
          log.debug(`################## delta size to ${newSize.width - initialSize.width} x ${newSize.height - initialSize.height}`);
          await browser.setWindowSize(newSize.width, newSize.height);

          // check again.
          currentSize = await screenshot.getScreenshotSize(await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
          log.debug(`################## second screenshot Size: ${currentSize.width} x ${currentSize.height}`);
        }
      }
    }


    it('should compare visualization screenshot for bar chart with count metric agg and date histogram with terms', async function () {
      const expectedSavedVizName = 'screenshot_area_chart_bar';
      const chartId = 'b5530c20-3d8a-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for area chart with legend position and grid lines', async function () {
      const expectedSavedVizName = 'screenshot_area_chart_options';
      const chartId = '21c7f0a0-3d8b-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for bar chart with percentile ranks metric agg with date histogram', async function () {
      const expectedSavedVizName = 'screenshot_barchart_percentile';
      const chartId = 'c7b6a720-3e8c-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for horizontal bar chart with top hits metric agg with date histogram', async function () {
      const expectedSavedVizName = 'screenshot_barchart_tophit';
      const chartId = 'f02d1f80-3e8d-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for data table with average metric agg with histogram', async function () {
      const expectedSavedVizName = 'screenshot_datatable_average';
      const chartId = '6aa67500-3e5b-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for data table with minimum bucket metric agg and geohash', async function () {
      const expectedSavedVizName = 'screenshot_datatable_options';
      const chartId = '1a610260-3daa-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for data table with count metric agg and significant terms bucket', async function () {
      const expectedSavedVizName = 'screenshot_datatable_significant';
      const chartId = '51ca1c70-3e61-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for gauge chart displayes as circles with sum bucket agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_gaugecircle_options';
      const chartId = '98a2f160-3e63-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for goal chart with color options and count metric agg', async function () {
      const expectedSavedVizName = 'screenshot_goal_chart_options';
      const chartId = 'c1aeb4d0-3e78-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for heatmap with all options with standard deviation and date range', async function () {
      const expectedSavedVizName = 'screenshot_heatmap_alloptions';
      const chartId = 'ad1c1090-3d91-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for bar chart with cumulative sum metrics agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_horizontal_bar_chart';
      const chartId = '942a50b0-3d96-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for input controls', async function () {
      const expectedSavedVizName = 'screenshot_inputcontrol_options';
      const chartId = '12b67090-3f2b-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for line chart with unique count agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_line_chart_options';
      const chartId = '1350b5e0-3d98-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for line chart with Max bucket and terms', async function () {
      const expectedSavedVizName = 'screenshot_line_chart_parent';
      const chartId = '1a7327c0-3e8f-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for line chart with bubbles', async function () {
      const expectedSavedVizName = 'screenshot_linechart_bubbles';
      const chartId = '054f4020-3e91-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for line chart with derivative agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_linechart_derivative';
      const chartId = 'da2e4bc0-3e90-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for line chart with serial diff agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_linechart_serial';
      const chartId = 'ee4cc9f0-3e91-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for mark down with text', async function () {
      const expectedSavedVizName = 'screenshot_markdown_options';
      const chartId = 'fc5bbe00-3f29-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for metric viz with median metric agg and filters', async function () {
      const expectedSavedVizName = 'screenshot_metrictable_median';
      const chartId = '8a369270-3e78-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for pie chart in donut mode with sum metric agg and range', async function () {
      const expectedSavedVizName = 'screenshot_piechart_donut';
      const chartId = 'ca543740-3d8d-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for pie chart in regular mode with unique count metric agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_piechart_unique_count';
      const chartId = '1ac7af10-3d8c-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for region map in regular mode with unique count agg', async function () {
      const expectedSavedVizName = 'screenshot_regionmap_options';
      const chartId = '79c36e60-3e8a-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for tag cloud with terms agg and default options', async function () {
      const expectedSavedVizName = 'screenshot_tagcloud_single';
      const chartId = '43706e30-3f52-11e8-bd4c-d37aa16de888';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for tile map with shaded geo hash map type and legend in bottom left', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_geohash';
      const chartId = 'f45ebc40-3e82-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for tile map with heatmap map type and legend in top left', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_heatmap';
      const chartId = '257f7fe0-3e87-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for tile map with circle markers map type and max bytes agg', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_options';
      const chartId = '62fdf040-3e82-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for timelion', async function () {
      const expectedSavedVizName = 'screenshot_timelion_colors';
      const chartId = '731b4990-3f28-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for vertical bar chart with percentiles metric agg and IPV4 Range', async function () {
      const expectedSavedVizName = 'screenshot_vertical_bar_chart_options';
      const chartId = 'e411df60-3d98-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for vertical bar chart with moving average agg and histogram', async function () {
      const expectedSavedVizName = 'screenshot_vertical_movingagg';
      const chartId = '82cc7ea0-3e91-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    it('should compare visualization screenshot for vertical bar chart with  average bucket metric agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_verticalbar_average';
      const chartId = '77f78b30-3e8e-11e8-9faa-599abad8b901';
      await compareScreenshot(expectedSavedVizName, baseUrl + chartId + urlQueryArgs);
    });

    // async function compareScreenshotX(expectedSavedVizName, threshold = 0.065) {
    //
    //   if(initialize) {
    //     initialize = false;
    //     const fromTime = '2015-09-19 06:31:44.000';
    //     const toTime = '2015-09-23 18:31:44.000';
    //     await PageObjects.common.navigateToApp('visualize');
    //     await PageObjects.visualize.openSavedVisualization(expectedSavedVizName);
    //     log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
    //     await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    //   } else {
    //     await PageObjects.visualize.loadSavedVisualization(expectedSavedVizName);
    //   }
    //
    //
    //   await PageObjects.header.waitUntilLoadingHasFinished();
    //   await PageObjects.common.sleep(1000);
    //   let currentUrl = await browser.getCurrentUrl();
    //   historyUrls += currentUrl + '\n';
    //   const percentDifferent = await screenshot.compareAgainstBaseline(expectedSavedVizName, updateBaselines, await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
    //   log.debug(`${(percentDifferent * 100).toPrecision(4)} : ${expectedSavedVizName}`);
    //   historyLog += `${(percentDifferent * 100).toPrecision(4)} : ${expectedSavedVizName}\n`;
    //   expect(percentDifferent).to.be.lessThan(threshold);
    //
    // }



    async function compareScreenshot(expectedSavedVizName, savedVizUrl, threshold = 0.065) {

      await browser.get(savedVizUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(8000);
      if (!screenshotCalibration) {
        const baselineImageSize = { width: 1216, height: 620 };
        await calibrateForScreenshots(baselineImageSize);
        screenshotCalibration = true;
      }

      const percentDifferent = await screenshot.compareAgainstBaseline(expectedSavedVizName,
        updateBaselines, await find.byCssSelector('div.app-wrapper div.app-wrapper-panel'));
      log.debug(`${(percentDifferent * 100).toPrecision(4)} : ${expectedSavedVizName}`);
      historyLog += `${(percentDifferent * 100).toPrecision(4)} : ${expectedSavedVizName}\n`;
      expect(percentDifferent).to.be.lessThan(threshold);

    }


  });
}
