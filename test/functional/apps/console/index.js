import { bdd, remote, scenarioManager, defaultTimeout } from '../../../support';

(function () {
  bdd.describe('console app', function () {
    this.timeout = defaultTimeout;

    bdd.before(function () {
      return remote.setWindowSize(1200,800);
    });

    require('./_console');
  });
}());
