import { bdd, remote, common, defaultTimeout, scenarioManager } from '../../../support';

(function () {
  bdd.describe('visualize app', function () {
    this.timeout = defaultTimeout;

    bdd.before(function () {
      var self = this;
      remote.setWindowSize(1200,800);
      // load a set of makelogs data
      common.debug('loadIfEmpty logstashFunctional ' + self.timeout);
      return scenarioManager.loadIfEmpty('logstashFunctional');
    });


    bdd.after(function unloadMakelogs() {
      return scenarioManager.unload('logstashFunctional');
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
