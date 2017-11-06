export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'timelion', 'header', 'settings']);

  describe('timelion app - expression typeahead', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp timelion');
      await PageObjects.common.navigateToApp('timelion');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('should display function suggestions', async () => {
      await PageObjects.timelion.setExpression('.elasticse');
      await PageObjects.common.sleep(10000);
      expect(true).to.eql(false);
    });
  });
}
