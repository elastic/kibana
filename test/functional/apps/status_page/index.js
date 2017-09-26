import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('status page', function () {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('status_page');
    });

    it('should show the kibana plugin as ready', async function () {
      await retry.tryForTime(6000, async () => {
        const text = await testSubjects.getVisibleText('statusBreakdown');
        expect(text.indexOf('plugin:kibana')).to.be.above(-1);
      });
    });
  });
}
