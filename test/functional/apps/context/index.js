
import {
  bdd,
  remote,
  scenarioManager,
  defaultTimeout
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('context app', function () {
  this.timeout = defaultTimeout;

  bdd.before(async function () {
    await PageObjects.remote.setWindowSize(1200,800);
    await scenarioManager.loadIfEmpty('logstashFunctional');
    await PageObjects.common.navigateToApp('discover');
  });

  bdd.after(function unloadMakelogs() {
    return scenarioManager.unload('logstashFunctional');
  });

  require('./_size.js');
});
