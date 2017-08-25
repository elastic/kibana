export default function ({ loadTestFile }) {
  describe('suggestions', () => {
    loadTestFile(require.resolve('./suggestions'));
  });
}
