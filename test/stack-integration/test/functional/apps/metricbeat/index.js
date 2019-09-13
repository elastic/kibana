import { bdd, defaultTimeout, esClient, common } from '../../../support';

bdd.describe('metricbeat app', function () {
  this.timeout = defaultTimeout;

  require('./_metricbeat');

});
