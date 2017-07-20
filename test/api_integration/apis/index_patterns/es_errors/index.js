export default function ({ loadTestFile }) {
  describe('index_patterns/service/lib', () => {
    loadTestFile(require.resolve('./errors'));
  });
}
