export default function ({ loadTestFile }) {
  describe('management apis', () => {
    loadTestFile(require.resolve('./saved_objects'));
  });
}
