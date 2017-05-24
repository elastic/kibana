export default function ({ getService, loadTestFile }) {
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');

  describe('discover app', function () {
    before(function () {
      return remote.setWindowSize(1200,800);
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_discover'));
    loadTestFile(require.resolve('./_field_data'));
    loadTestFile(require.resolve('./_shared_links'));
    loadTestFile(require.resolve('./_collapse_expand'));
    loadTestFile(require.resolve('./_source_filters'));
  });
}
