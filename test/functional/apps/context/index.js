export default function ({ getService, getPageObjects, loadTestFile }) {
  const config = getService('config');
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);

  describe('context app', function () {
    this.timeout(config.get('timeouts.test'));

    before(async function () {
      await remote.setWindowSize(1200,800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await PageObjects.common.navigateToApp('discover');
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_discover_navigation'));
    loadTestFile(require.resolve('./_size'));
  });

}
