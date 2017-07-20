export default function ({ loadTestFile }) {
  describe('scripts', () => {
    loadTestFile(require.resolve('./languages'));
  });
}
