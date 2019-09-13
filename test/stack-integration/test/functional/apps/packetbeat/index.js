import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('packetbeat app', function () {
  this.timeout = defaultTimeout;

  require('./_packetbeat');

});
