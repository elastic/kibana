import { bdd, defaultTimeout, scenarioManager, esClient, common } from '../../../support';

bdd.describe('settings app', function () {
  this.timeout = defaultTimeout;

  // on setup, we create an settingsPage instance
  // that we will use for all the tests
  bdd.before(function () {
    return scenarioManager.loadIfEmpty('makelogs');
  });

  bdd.after(function () {
    return scenarioManager.unload('makelogs')
    .then(function () {
      return esClient.delete('.kibana');
    });
  });

  require('./_initial_state');
  require('./_creation_form_changes');
  require('./_index_pattern_create_delete');
  require('./_index_pattern_results_sort');
  require('./_index_pattern_popularity');
  require('./_kibana_settings');
});
