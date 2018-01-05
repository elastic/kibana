export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('suite1', () => {
    before(async () => {
      process.send({
        name: 'before suite1',
        size: await remote.getWindowSize()
      });

      await remote.setWindowSize(1000, 1000);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite1',
        size: await remote.getWindowSize()
      });
    });

    loadTestFile(require.resolve('./test2'));
    loadTestFile(require.resolve('./test3'));

    after(async () => {
      process.send({
        name: 'after suite1',
        size: await remote.getWindowSize()
      });
    });
  });
}
