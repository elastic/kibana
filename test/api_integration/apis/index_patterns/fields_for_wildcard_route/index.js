export default function ({ loadTestFile }) {
  describe('index_patterns/_fields_for_wildcard route', () => {
    loadTestFile(require.resolve('./params'));
    loadTestFile(require.resolve('./conflicts'));
  });
}
