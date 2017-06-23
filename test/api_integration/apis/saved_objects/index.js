export default function ({ loadTestFile }) {
  describe('scripts', () => {
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./find'));
  });
}
