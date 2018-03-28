export default function ({ loadTestFile }) {
  describe('saved_objects', () => {
    loadTestFile(require.resolve('./relationships'));
  });
}
