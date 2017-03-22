import { bdd, defaultTimeout, scenarioManager, esClient } from '../../../support';

bdd.describe('settings app', function () {
  this.timeout = defaultTimeout;

  // on setup, we create an settingsPage instance
  // that we will use for all the tests
  bdd.before(async function () {
    await scenarioManager.unload('logstashFunctional');
    await scenarioManager.loadIfEmpty('makelogs');
  });

  bdd.after(async function () {
    await scenarioManager.unload('makelogs');
    await esClient.delete('.kibana');
  });

  require('./_initial_state');
  require('./_creation_form_changes');
  require('./_index_pattern_create_delete');
  require('./_index_pattern_results_sort');
  require('./_index_pattern_popularity');
  require('./_kibana_settings');
  require('./_scripted_fields');
  require('./_index_pattern_filter');
  require('./_scripted_fields_filter');
});
