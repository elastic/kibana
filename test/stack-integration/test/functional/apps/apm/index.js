import { bdd, defaultTimeout } from '../../../support';

bdd.describe('apm-server app', function () {
  this.timeout = defaultTimeout;

  require('./_apm-server');

});
