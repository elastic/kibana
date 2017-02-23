
import {
  bdd,
  defaultTimeout,
  remote,
  esArchiver,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('context app', function () {
  this.timeout = defaultTimeout;

  bdd.before(async function () {
    await PageObjects.remote.setWindowSize(1200,800);
    await esArchiver.loadIfNeeded('logstash_functional');
    await esArchiver.load('visualize');
    await PageObjects.common.navigateToApp('discover');
  });

  bdd.after(function unloadMakelogs() {
    return esArchiver.unload('logstash_functional');
  });

  require('./_discover_navigation');
  require('./_size');
});
