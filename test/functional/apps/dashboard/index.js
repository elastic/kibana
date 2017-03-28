export default function ({ getService, loadTestFile }) {
  const config = getService('config');
  const remote = getService('remote');

  describe('dashboard app', function () {
    this.timeout(config.get('timeouts.test'));

    before(() => remote.setWindowSize(1200,800));

    loadTestFile(require.resolve('./_view_edit'));
    loadTestFile(require.resolve('./_dashboard'));
    loadTestFile(require.resolve('./_dashboard_save'));
    loadTestFile(require.resolve('./_dashboard_time'));
  });
}
