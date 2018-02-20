export default function ({ loadTestFile }) {
  describe('tags', () => {
    loadTestFile(require.resolve('./get'));
  });
}
