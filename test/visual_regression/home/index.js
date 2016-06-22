import {
  bdd,
  remote,
  scenarioManager,
  defaultTimeout
} from '../../support';

bdd.describe('Home', function () {
  this.timeout = defaultTimeout;

  bdd.before(function () {
    return remote.setWindowSize(1200, 800);
  });

  require('./_loading');
});
