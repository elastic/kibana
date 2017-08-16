export default function ({ loadTestFile }) {
  describe('supported features', () => {
    loadTestFile(require.resolve('./supported_features'));
  });
}
