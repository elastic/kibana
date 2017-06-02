export default function ({ loadTestFile }) {
  describe('index_patterns/_fields_for_time_pattern', () => {
    loadTestFile(require.resolve('./errors'));
    loadTestFile(require.resolve('./pattern'));
    loadTestFile(require.resolve('./query_params'));
  });
}
