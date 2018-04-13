export default function ({ getService, loadTestFile, getPageObjects }) {
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');

  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard tests on v6.3 data', function () {
    before(async () => {
      await remote.setWindowSize(1300, 900);
      await PageObjects.dashboard.initTests({
        kibanaIndex: 'dashboard/6_3/kibana',
        dataIndex: 'dashboard/6_3/data',
        defaultIndex: 'logstash-*'
      });
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
      await esArchiver.unload('dashboard/6_3/kibana');
      await esArchiver.unload('dashboard/6_3/data');
    });

    // This has to be first since the other tests create some embeddables as side affects and our counting assumes
    // a fresh index.
    loadTestFile(require.resolve('./_embeddable_rendering'));
    loadTestFile(require.resolve('./_create_and_add_embeddables'));
    loadTestFile(require.resolve('./_dashboard_options'));
    loadTestFile(require.resolve('./_data_shared_attributes'));
    loadTestFile(require.resolve('./_embed_mode'));
    loadTestFile(require.resolve('./_full_screen_mode'));
    loadTestFile(require.resolve('./_dashboard_filter_bar'));
    loadTestFile(require.resolve('./_dashboard_filtering'));
    loadTestFile(require.resolve('./_panel_expand_toggle'));
    loadTestFile(require.resolve('./_dashboard_grid'));
  });
}
