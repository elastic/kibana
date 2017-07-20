import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'discover', 'header']);

  describe('discover tab', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      return esArchiver.load('discover')
      .then(function loadkibanaIndexPattern() {
        log.debug('load kibana index with default index pattern');
        return kibanaServer.uiSettings.replace({
          'dateFormat:tz':'UTC',
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
      });
    });

    describe('field data', function () {
      it('should initially be expanded', function () {
        screenshots.take('Discover-sidebar-expanded');
        return PageObjects.discover.getSidebarWidth()
          .then(function (width) {
            log.debug('expanded sidebar width = ' + width);
            expect(width > 20).to.be(true);
          });
      });

      it('should collapse when clicked', function () {
        return PageObjects.discover.toggleSidebarCollapse()
          .then(function () {
            screenshots.take('Discover-sidebar-collapsed');
            log.debug('PageObjects.discover.getSidebarWidth()');
            return PageObjects.discover.getSidebarWidth();
          })
          .then(function (width) {
            log.debug('collapsed sidebar width = ' + width);
            expect(width < 20).to.be(true);
          });
      });

      it('should expand when clicked', function () {
        return PageObjects.discover.toggleSidebarCollapse()
          .then(function () {
            log.debug('PageObjects.discover.getSidebarWidth()');
            return PageObjects.discover.getSidebarWidth();
          })
          .then(function (width) {
            log.debug('expanded sidebar width = ' + width);
            expect(width > 20).to.be(true);
          });
      });
    });
  });
}
