export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('console app', function () {
    before(async function () {
      await remote.setWindowSize(1200,800);
    });

    loadTestFile(require.resolve('./_console'));
  });
}
