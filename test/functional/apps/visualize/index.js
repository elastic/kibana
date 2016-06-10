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
      var logstash = scenarioManager.loadIfEmpty('logstashFunctional');
      // delete .kibana index and update configDoc
      return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
      .then(function loadkibanaIndexPattern() {
        common.debug('load kibana index with default index pattern');
        return elasticDump.elasticLoad('visualize','.kibana');
      })
      // wait for the logstash data load to finish if it hasn't already
      .then(function () {
        return logstash;
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
