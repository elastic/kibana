export default function ({ loadTestFile }) {
  describe('general', () => {
    loadTestFile(require.resolve('./cookies'));
  });
}
