import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('graph app', function () {
  this.timeout = defaultTimeout;

  // require('./_graph');
  require('./_graph_simple');

});
