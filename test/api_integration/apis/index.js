export default function ({ loadTestFile }) {
  describe('apis', () => {
    loadTestFile(require.resolve('./index_patterns'));
    loadTestFile(require.resolve('./saved_objects'));
    loadTestFile(require.resolve('./scripts'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./suggestions'));
  });
}
