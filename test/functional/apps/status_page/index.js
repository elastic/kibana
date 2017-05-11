import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('status page', function () {
    before(function () {
      return PageObjects.common.navigateToApp('status_page');
    });

    it('should show the kibana plugin as ready', function () {
      return retry.tryForTime(6000, function () {
        return testSubjects.find('statusBreakdown')
        .getVisibleText()
        .then(function (text) {
          screenshots.take('Status');
          expect(text.indexOf('plugin:kibana')).to.be.above(-1);
        });
      });
    });
  });
}
