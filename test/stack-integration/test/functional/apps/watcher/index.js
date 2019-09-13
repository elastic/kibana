import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('watcher app', function () {
  this.timeout = defaultTimeout;

  require('./_watcher');

});
