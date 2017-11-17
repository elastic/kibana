export default function ({ getService }) {
  const remote = getService('remote');

  describe('suite2', () => {
    before(async () => {
      process.send({
        name: 'before suite2',
        size: await remote.getWindowSize()
      });

      await remote.setWindowSize(900, 900);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite2',
        size: await remote.getWindowSize()
      });
    });

    after(async () => {
      process.send({
        name: 'after suite2',
        size: await remote.getWindowSize()
      });
    });
  });
}
