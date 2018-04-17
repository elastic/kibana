import expect from 'expect.js';

export default function ({ getService, getPageObjects, updateBaselines }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const screenshot = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);


  describe('visualize app', function describeIndexTests() {
    let initialize = true;
    before(async function () {
      await esArchiver.load('visualization_screenshots');
      await PageObjects.common.navigateToApp('visualize');
    });

    it('should compare visualization screenshot for bar chart with count metric agg and date histogram with terms', async function () {
      const expectedSavedVizName = 'screenshot_area_chart_bar';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for area chart with legend position and grid lines', async function () {
      const expectedSavedVizName = 'screenshot_area_chart_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for bar chart with percentile ranks metric agg with date histogram', async function () {
      const expectedSavedVizName = 'screenshot_barchart_percentile';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for horizontal bar chart with top hits metric agg with date histogram', async function () {
      const expectedSavedVizName = 'screenshot_barchart_tophit';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for data table with average metric agg with histogram', async function () {
      const expectedSavedVizName = 'screenshot_datatable_average';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for data table with minimum bucket metric agg and geohash', async function () {
      const expectedSavedVizName = 'screenshot_datatable_options';
      await compareScreenshot(expectedSavedVizName, 0.07);
    });

    it('should compare visualization screenshot for data table with count metric agg and significant terms bucket', async function () {
      const expectedSavedVizName = 'screenshot_datatable_significant';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for gauge chart displayes as circles with sum bucket agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_gaugecircle_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for goal chart with color options and count metric agg', async function () {
      const expectedSavedVizName = 'screenshot_goal_chart_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for heatmap with all options with standard deviation and date range', async function () {
      const expectedSavedVizName = 'screenshot_heatmap_alloptions';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for bar chart with cumulative sum metrics agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_horizontal_bar_chart';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for input controls', async function () {
      const expectedSavedVizName = 'screenshot_inputcontrol_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for line chart with unique count agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_line_chart_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for line chart with Max bucket and terms', async function () {
      const expectedSavedVizName = 'screenshot_line_chart_parent';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for line chart with bubbles', async function () {
      const expectedSavedVizName = 'screenshot_linechart_bubbles';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for line chart with derivative agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_linechart_derivative';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for line chart with serial diff agg and date histogram', async function () {
      const expectedSavedVizName = 'screenshot_linechart_serial';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for mark down with text', async function () {
      const expectedSavedVizName = 'screenshot_markdown_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for metric viz with median metric agg and filters', async function () {
      const expectedSavedVizName = 'screenshot_metrictable_median';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for pie chart in donut mode with sum metric agg and range', async function () {
      const expectedSavedVizName = 'screenshot_piechart_donut';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for pie chart in regular mode with unique count metric agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_piechart_unique_count';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for region map in regular mode with unique count agg', async function () {
      const expectedSavedVizName = 'screenshot_regionmap_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for tag cloud with terms agg and default options', async function () {
      const expectedSavedVizName = 'screenshot_tagcloud_single';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for tile map with shaded geo hash map type and legend in bottom left', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_geohash';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for tile map with heatmap map type and legend in top left', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_heatmap';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for tile map with circle markers map type and max bytes agg', async function () {
      const expectedSavedVizName = 'screenshot_tilemap_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for timelion', async function () {
      const expectedSavedVizName = 'screenshot_timelion_colors';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for vertical bar chart with percentiles metric agg and IPV4 Range', async function () {
      const expectedSavedVizName = 'screenshot_vertical_bar_chart_options';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for vertical bar chart with moving average agg and histogram', async function () {
      const expectedSavedVizName = 'screenshot_vertical_movingagg';
      await compareScreenshot(expectedSavedVizName);
    });

    it('should compare visualization screenshot for vertical bar chart with  average bucket metric agg and terms', async function () {
      const expectedSavedVizName = 'screenshot_verticalbar_average';
      await compareScreenshot(expectedSavedVizName);
    });

    async function compareScreenshot(expectedSavedVizName, threshold = 0.050) {

      if(initialize) {
        initialize = false;
        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.openSavedVisualization(expectedSavedVizName);
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      } else {
        await PageObjects.visualize.loadSavedVisualization(expectedSavedVizName);
      }


      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1000);
      const percentDifferent = await screenshot.compareAgainstBaseline(expectedSavedVizName, updateBaselines);
      expect(percentDifferent).to.be.lessThan(threshold);

    }

  });
}
