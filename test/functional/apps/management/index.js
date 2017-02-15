import {
  bdd,
  defaultTimeout,
  esArchiver,
  common,
} from '../../../support';

bdd.describe('settings app', function () {
  this.timeout = defaultTimeout;

  // on setup, we create an settingsPage instance
  // that we will use for all the tests
  bdd.before(async function () {
    await esArchiver.unload('logstash_functional');
    await esArchiver.load('empty_kibana');
    await esArchiver.loadIfNeeded('makelogs');
  });

  bdd.after(async function () {
    await esArchiver.unload('makelogs');
    await esArchiver.unload('empty_kibana');
  });

  require('./_initial_state');
  require('./_creation_form_changes');
  require('./_index_pattern_create_delete');
  require('./_index_pattern_results_sort');
  require('./_index_pattern_popularity');
  require('./_kibana_settings');
  require('./_scripted_fields');
});
