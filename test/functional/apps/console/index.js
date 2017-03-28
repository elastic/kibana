export default function ({ getService, loadTestFile }) {
  const config = getService('config');
  const remote = getService('remote');

  describe('console app', function () {
    this.timeout(config.get('timeouts.find'));

    before(async function () {
      await remote.setWindowSize(1200,800);
    });

    loadTestFile(require.resolve('./_console'));
  });
}
