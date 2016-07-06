
import {
  bdd,
  remote,
  scenarioManager,
  defaultTimeout
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('discover app', function () {
  this.timeout = defaultTimeout;

  bdd.before(function () {
    return PageObjects.remote.setWindowSize(1200,800);
  });

  bdd.after(function unloadMakelogs() {
    return scenarioManager.unload('logstashFunctional');
  });

  require('./_discover');
  require('./_field_data');
  require('./_shared_links');
  require('./_collapse_expand');
});
