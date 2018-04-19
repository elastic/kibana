export default function ({ loadTestFile }) {
  describe('status', () => {
    loadTestFile(require.resolve('./status'));
  });
}

