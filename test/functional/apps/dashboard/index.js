import { bdd, remote, scenarioManager, defaultTimeout } from '../../../support';

(function () {
  bdd.describe('dashboard app', function () {
    this.timeout = defaultTimeout;

    bdd.before(function () {
      return remote.setWindowSize(1200,800);
    });

    require('./_dashboard');
  });
}());
