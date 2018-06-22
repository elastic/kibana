import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'discover']);

  describe('source filters', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('visualize_source-filters');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      log.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      await PageObjects.common.sleep(1000);
    });

    it('should not get the field referer', async function () {
      //let  fieldNames;
      const fieldNames = await PageObjects.discover.getAllFieldNames();
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter(
        fieldName => fieldName.indexOf('relatedContent') === 0
      );
      expect(relatedContentFields).to.have.length(0);
    });
  });
}
