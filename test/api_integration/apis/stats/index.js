export default function ({ loadTestFile }) {
  describe('stats', () => {
    loadTestFile(require.resolve('./stats'));
  });
}

