export default function ({ getService, loadTestFile, getPageObjects }) {
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard app', function () {
    describe('using current data', function () {
      before(async () => {
        await remote.setWindowSize(1300, 900);
        await PageObjects.dashboard.initTests({
          kibanaIndex: 'dashboard/current/kibana',
          dataIndex: 'dashboard/current/data',
          defaultIndex: 'logstash-*'
        });
        await PageObjects.dashboard.preserveCrossAppState();
      });

      after(async function () {
        await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
        await esArchiver.unload('dashboard/current/kibana');
        await esArchiver.unload('dashboard/current/data');
      });

      // This has to be first since the other tests create some embeddables as side affects and our counting assumes
      // a fresh index.
      loadTestFile(require.resolve('./_embeddable_rendering'));
      loadTestFile(require.resolve('./_create_and_add_embeddables'));
      loadTestFile(require.resolve('./_time_zones'));
      loadTestFile(require.resolve('./_dashboard_options'));
      loadTestFile(require.resolve('./_data_shared_attributes'));
      loadTestFile(require.resolve('./_embed_mode'));
      loadTestFile(require.resolve('./_full_screen_mode'));
      loadTestFile(require.resolve('./_dashboard_filter_bar'));
      loadTestFile(require.resolve('./_dashboard_filtering'));
      loadTestFile(require.resolve('./_panel_expand_toggle'));
      loadTestFile(require.resolve('./_dashboard_grid'));
    });

    // Each of these tests call initTests themselves, the way it was originally written.  The above tests only load
    // the data once to save on time. Eventually, all of these tests should just use current data and we can reserve
    // legacy data only for specifically testing BWC situations.
    describe('using legacy data', function () {
      before(() => remote.setWindowSize(1200, 900));

      loadTestFile(require.resolve('./_dashboard_time_picker'));
      loadTestFile(require.resolve('./_bwc_shared_urls'));
      loadTestFile(require.resolve('./_dashboard_snapshots'));
      loadTestFile(require.resolve('./_panel_controls'));
      loadTestFile(require.resolve('./_view_edit'));
      loadTestFile(require.resolve('./_dashboard_state'));
      loadTestFile(require.resolve('./_dashboard_save'));
      loadTestFile(require.resolve('./_dashboard_time'));
      loadTestFile(require.resolve('./_dashboard_listing'));
      loadTestFile(require.resolve('./_dashboard_clone'));
    });
  });
}
