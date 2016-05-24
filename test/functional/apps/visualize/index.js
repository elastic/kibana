import { bdd, remote, common, defaultTimeout, scenarioManager } from '../../../support';

(function () {
  bdd.describe('visualize app', function () {

    this.timeout = defaultTimeout;

    bdd.before(function () {
      var self = this;
      common.debug('Starting visualize before method');
      remote.setWindowSize(1200,800);
      // load a set of makelogs data
      common.debug('scenarioManager.unload(emptyKibana)');
      return scenarioManager.unload('emptyKibana')
      .then(function () {
        return common.try(function () {
          return scenarioManager.updateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'});
        });
      })
      .then(function () {
        common.debug('load kibana index with logstash-* pattern');
        return common.elasticLoad('kibana3.json','.kibana');
      })
      .then(function () {
        common.debug('loadIfEmpty logstashFunctional ' + self.timeout);
        return scenarioManager.loadIfEmpty('logstashFunctional');
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
}());
