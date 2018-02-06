export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('suite3', () => {
    before(async () => {
      process.send({
        name: 'before suite3',
        size: await remote.getWindowSize()
      });

      await remote.setWindowSize(800, 800);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite3',
        size: await remote.getWindowSize()
      });
    });

    loadTestFile(require.resolve('./test3.1'));

    after(async () => {
      process.send({
        name: 'after suite3',
        size: await remote.getWindowSize()
      });
    });
  });
}
