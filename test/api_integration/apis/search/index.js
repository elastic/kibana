export default function ({ loadTestFile }) {
  describe('search', () => {
    loadTestFile(require.resolve('./count'));
  });
}
