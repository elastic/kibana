export default function ({ loadTestFile }) {
  describe('index_patterns', () => {
    loadTestFile(require.resolve('./es_errors'));
    loadTestFile(require.resolve('./fields_for_wildcard_route'));
  });
}
