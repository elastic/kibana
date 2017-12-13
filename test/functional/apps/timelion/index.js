export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('timelion app', function () {
    before(async function () {
      log.debug('Starting timelion before method');
      remote.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
    });

    loadTestFile(require.resolve('./_expression_typeahead'));
  });
}
