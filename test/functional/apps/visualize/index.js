export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('visualize app', function () {
    before(function () {
      remote.setWindowSize(1280,800);

      log.debug('Starting visualize before method');
      const logstash = esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load .kibana index with visualize test data');
      return esArchiver.load('visualize')
      .then(function loadkibanaIndexPattern() {
        log.debug('make sure UTC timezone and default index pattern are set in .kibana');
        return kibanaServer.uiSettings.replace({ 'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*' });
      })
      // wait for the logstash data load to finish if it hasn't already
      .then(function () {
        return logstash;
      });
    });

    loadTestFile(require.resolve('./_chart_types'));
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
    loadTestFile(require.resolve('./_shared_item'));
  });
}
