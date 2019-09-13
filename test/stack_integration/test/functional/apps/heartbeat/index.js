import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('heartbeat app', function () {
  this.timeout = defaultTimeout;

  require('./_heartbeat');

});
