export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('dashboard app', function () {
    before(() => remote.setWindowSize(1200, 900));
    loadTestFile(require.resolve('./_bwc_shared_urls'));
    loadTestFile(require.resolve('./_dashboard_queries'));
    loadTestFile(require.resolve('./_dashboard_snapshots'));
    loadTestFile(require.resolve('./_dashboard_grid'));
    loadTestFile(require.resolve('./_panel_controls'));
    loadTestFile(require.resolve('./_view_edit'));
    loadTestFile(require.resolve('./_dashboard'));
    loadTestFile(require.resolve('./_dashboard_state'));
    loadTestFile(require.resolve('./_dashboard_save'));
    loadTestFile(require.resolve('./_dashboard_time'));
    loadTestFile(require.resolve('./_dashboard_listing'));
    loadTestFile(require.resolve('./_dashboard_clone'));
  });
}
