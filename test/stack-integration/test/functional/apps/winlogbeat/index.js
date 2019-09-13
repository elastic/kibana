import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('winlogbeat app', function () {
  this.timeout = defaultTimeout;

  require('./_winlogbeat');

});
