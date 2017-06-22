export default function ({ loadTestFile }) {
  describe('scripts', () => {
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./create'));
  });
}
