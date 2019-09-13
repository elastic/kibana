import { bdd, defaultTimeout, esClient, common } from '../../../support';
 bdd.describe('telemetry feature', function () {
  this.timeout = defaultTimeout;
   require('./_telemetry');
 });
