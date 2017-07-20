export default function ({ getService, getPageObjects, loadTestFile }) {
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const kibanaServer = getService('kibanaServer');

  describe('context app', function () {
    before(async function () {
      await remote.setWindowSize(1200,800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz':'UTC',
        'defaultIndex':'logstash-*'
      });

      await PageObjects.common.navigateToApp('discover');
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_discover_navigation'));
    loadTestFile(require.resolve('./_filters'));
    loadTestFile(require.resolve('./_size'));
  });

}
