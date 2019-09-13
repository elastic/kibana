import { bdd, defaultTimeout } from '../../../support';

bdd.describe('code test', function () {
  this.timeout = defaultTimeout;

  require('./_manage_repositories.js');

});