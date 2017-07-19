export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('dashboard app', function () {
    before(() => remote.setWindowSize(1200,800));

    loadTestFile(require.resolve('./_view_edit'));
    loadTestFile(require.resolve('./_dashboard'));
    loadTestFile(require.resolve('./_dashboard_save'));
    loadTestFile(require.resolve('./_dashboard_time'));
    loadTestFile(require.resolve('./_dashboard_listing'));
    loadTestFile(require.resolve('./_dashboard_clone'));
  });
}
