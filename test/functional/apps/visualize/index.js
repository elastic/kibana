export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('visualize app', function () {
    before(async function () {
      log.debug('Starting visualize before method');
      remote.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
    });

    loadTestFile(require.resolve('./_spy_panel'));
    loadTestFile(require.resolve('./_chart_types'));
    loadTestFile(require.resolve('./_experimental_vis'));
    loadTestFile(require.resolve('./_gauge_chart'));
    loadTestFile(require.resolve('./_area_chart'));
    loadTestFile(require.resolve('./_line_chart'));
    loadTestFile(require.resolve('./_data_table'));
    loadTestFile(require.resolve('./_pie_chart'));
    loadTestFile(require.resolve('./_tag_cloud'));
    loadTestFile(require.resolve('./_tile_map'));
    loadTestFile(require.resolve('./_region_map'));
    loadTestFile(require.resolve('./_vertical_bar_chart'));
    loadTestFile(require.resolve('./_heatmap_chart'));
    loadTestFile(require.resolve('./_point_series_options'));
    loadTestFile(require.resolve('./_markdown_vis'));
    loadTestFile(require.resolve('./_tsvb_chart'));
    loadTestFile(require.resolve('./_shared_item'));
    loadTestFile(require.resolve('./_input_control_vis'));
    loadTestFile(require.resolve('./_histogram_request_start'));
    loadTestFile(require.resolve('./_vega_chart'));
    loadTestFile(require.resolve('./_lab_mode'));
    loadTestFile(require.resolve('./_linked_saved_searches.js'));
  });
}
