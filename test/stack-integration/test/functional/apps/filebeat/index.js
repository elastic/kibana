import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('filebeat app', function () {
  this.timeout = defaultTimeout;

  require('./_filebeat');

});
