import {
  bdd,
  remote,
  common,
  defaultTimeout,
  scenarioManager,
  esClient,
  elasticDump
 } from '../../../support';

(function () {
  bdd.describe('visualize app', function () {
    this.timeout = defaultTimeout;

    bdd.before(function () {
      var self = this;
      remote.setWindowSize(1200,800);

      common.debug('Starting visualize before method');
      // Calling loadIfEmpty but not chaining the response.  We can start the
      // testing before this finishes.
      // The first test is _chart_types which does not require the data to be loaded.
      // Loading this data takes about 10 seconds.
      scenarioManager.loadIfEmpty('logstashFunctional');
      return esClient.delete('.kibana')
      .then(function () {
        return common.try(function () {
          return esClient.updateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'});
        });
      })
      .then(function loadkibanaIndexPattern() {
        common.debug('load kibana index with default index pattern');
        return elasticDump.elasticLoad('visualize','.kibana');
      })
      .catch(common.handleError(this));
    });

    require('./_chart_types');
    require('./_area_chart');
    require('./_line_chart');
    require('./_data_table');
    require('./_metric_chart');
    require('./_pie_chart');
    require('./_tile_map');
    require('./_vertical_bar_chart');
  });
}());
