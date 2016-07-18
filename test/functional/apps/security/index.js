import { bdd, defaultTimeout, scenarioManager, esClient, common } from '../../../support';

bdd.describe('users app', function () {
  this.timeout = defaultTimeout;

  // on setup, we create an settingsPage instance
  // that we will use for all the tests
  // bdd.before(function () {
  //   return scenarioManager.loadIfEmpty('makelogs');
  // });
  //
  // bdd.after(function () {
  //   return scenarioManager.unload('makelogs')
  //   .then(function () {
  //     return esClient.delete('.kibana');
  //   });
  // });

  require('./_users');

});
