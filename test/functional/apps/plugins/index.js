export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('plugin tests', function () {
    before(function () {
      return remote.setWindowSize(1200, 800);
    });

    loadTestFile(require.resolve('./_apps'));
  });
}
