import { bdd, remote, scenarioManager, defaultTimeout } from '../../../support';

bdd.describe('discover app', function () {
  this.timeout = defaultTimeout;

  bdd.before(function () {
    return remote.setWindowSize(1200,800);
  });

  bdd.after(function unloadMakelogs() {
    return scenarioManager.unload('logstashFunctional');
  });

  require('./_discover');
  require('./_field_data');
  require('./_shared_links');
  require('./_collapse_expand');
  require('./_field_filters');
});
