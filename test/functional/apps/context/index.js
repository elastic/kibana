
import { bdd, defaultTimeout, elasticDump, scenarioManager } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('context app', function () {
  this.timeout = defaultTimeout;

  bdd.before(async function () {
    await PageObjects.remote.setWindowSize(1200,800);
    await scenarioManager.loadIfEmpty('logstashFunctional');
    await elasticDump.elasticLoad('visualize','.kibana');
    await PageObjects.common.navigateToApp('discover');
  });

  bdd.after(function unloadMakelogs() {
    return scenarioManager.unload('logstashFunctional');
  });

  require('./_discover_navigation');
  require('./_size');
});
