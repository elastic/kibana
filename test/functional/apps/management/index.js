export default function ({ getService, loadTestFile }) {
  const esArchiver = getService('esArchiver');

  describe('management', function () {
    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    before(async function () {
      await esArchiver.unload('logstash_functional');
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('makelogs');
    });

    after(async function () {
      await esArchiver.unload('makelogs');
      await esArchiver.unload('empty_kibana');
    });

    loadTestFile(require.resolve('./_initial_state'));
    loadTestFile(require.resolve('./_creation_form_changes'));
    loadTestFile(require.resolve('./_index_pattern_create_delete'));
    loadTestFile(require.resolve('./_index_pattern_results_sort'));
    loadTestFile(require.resolve('./_index_pattern_popularity'));
    loadTestFile(require.resolve('./_kibana_settings'));
    loadTestFile(require.resolve('./_scripted_fields'));
    loadTestFile(require.resolve('./_index_pattern_filter'));
    loadTestFile(require.resolve('./_scripted_fields_filter'));
  });

}
