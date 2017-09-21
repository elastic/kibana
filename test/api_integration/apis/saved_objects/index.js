export default function ({ loadTestFile }) {
  describe('saved_objects', () => {
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./delete'));
  });
}
