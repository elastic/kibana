export default function ({ getService }) {
  const remote = getService('remote');

  describe('suite3.1', () => {
    before(async () => {
      process.send({
        name: 'before suite3.1',
        size: await remote.getWindowSize()
      });

      await remote.setWindowSize(700, 700);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite3.1',
        size: await remote.getWindowSize()
      });
    });

    after(async () => {
      process.send({
        name: 'after suite3.1',
        size: await remote.getWindowSize()
      });
    });
  });
}
