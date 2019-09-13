
import expect from 'expect.js';

import {
  bdd,
  remote,
  defaultTimeout,
  esClient
 } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function () {
  this.timeout = defaultTimeout;

  bdd.before(function () {
    remote.setWindowSize(1200,800);
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
