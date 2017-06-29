export default function ({ loadTestFile }) {
  describe('apis', () => {
    loadTestFile(require.resolve('./index_patterns'));
    loadTestFile(require.resolve('./scripts'));
    loadTestFile(require.resolve('./search'));
  });
}
