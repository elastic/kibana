import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'discover']);

  describe('source filters', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      return esArchiver.load('visualize_source-filters')
      .then(function loadkibanaIndexPattern() {
        log.debug('load kibana index with default index pattern');
        return kibanaServer.uiSettings.replace({
          'dateFormat:tz': 'UTC',
          'defaultIndex':'logstash-*'
        });
      })
      // and load a set of makelogs data
      .then(function loadIfEmptyMakelogs() {
        return esArchiver.loadIfNeeded('logstash_functional');
      })
      .then(function () {
        log.debug('discover');
        return PageObjects.common.navigateToApp('discover');
      })
      .then(function () {
        log.debug('setAbsoluteRange');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      })
      .then(function () {
        //After hiding the time picker, we need to wait for
        //the refresh button to hide before clicking the share button
        return PageObjects.common.sleep(1000);
      });
    });

    it('should not get the field referer', function () {
      return PageObjects.discover.getAllFieldNames()
      .then(function (fieldNames) {
        expect(fieldNames).to.not.contain('referer');
        const relatedContentFields = fieldNames.filter((fieldName) => fieldName.indexOf('relatedContent') === 0);
        expect(relatedContentFields).to.have.length(0);
      });
    });
  });
}
