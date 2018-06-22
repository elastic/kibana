import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header']);

  describe('discover tab', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      log.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    describe('collapse expand', function () {
      it('should initially be expanded', async function () {
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('expanded sidebar width = ' + width);
        expect(width > 20).to.be(true);
      });

      it('should collapse when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();
        log.debug('PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('collapsed sidebar width = ' + width);
        expect(width < 20).to.be(true);
      });

      it('should expand when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();

        log.debug('PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('expanded sidebar width = ' + width);
        expect(width > 20).to.be(true);
      });
    });
  });
}
