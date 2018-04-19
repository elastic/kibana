export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('Getting Started ', function () {
    before(async function () {
      await remote.setWindowSize(1200, 800);
    });
    // https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html
    loadTestFile(require.resolve('./_shakespeare'));
  });
}
