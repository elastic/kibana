
import expect from 'expect.js';

import {
  bdd,
  remote,
  defaultTimeout,
  scenarioManager,
  esClient,
  elasticDump
 } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function () {
  this.timeout = defaultTimeout;

  bdd.before(function () {
    var self = this;
    remote.setWindowSize(1200,800);

    PageObjects.common.debug('Starting visualize before method');
    var logstash = scenarioManager.loadIfEmpty('logstashFunctional');
    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    .then(function loadkibanaIndexPattern() {
      PageObjects.common.debug('load kibana index with default index pattern');
      return elasticDump.elasticLoad('visualize','.kibana');
    })
    // wait for the logstash data load to finish if it hasn't already
    .then(function () {
      return logstash;
    });
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
