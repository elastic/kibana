import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'header']);

  describe('add index patterns for alias1 - contains no time field', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('alias');
      //await PageObjects.settings.navigateTo();
      //await PageObjects.settings.clickKibanaIndices();
      log.debug('index patterns are loaded');
      await es.indices.updateAliases({
        body: {
          actions: [
            { 'add': { 'index': 'test1', 'alias': 'alias1' } },
            { 'add': { 'index': 'test2', 'alias': 'alias1' } },
            { 'add': { 'index': 'test3', 'alias': 'alias1' } },
            { 'add': { 'index': 'test4', 'alias': 'alias1' } },
            { 'add': { 'index': 'test5', 'alias': 'alias2' } },
            { 'add': { 'index': 'test6', 'alias': 'alias2' } },
            { 'add': { 'index': 'test7', 'alias': 'alias2' } },
            { 'add': { 'index': 'test8', 'alias': 'alias2' } },
            { 'add': { 'index': 'test9', 'alias': 'alias2' } }
          ]
        }
      });
    });

    it('should be able to create index pattern alias1: without time field', async function () {
      log.debug('create alias1 index pattern');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('alias1', null);
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('alias1*');
    });

    it('should be able to discover and verify no of hits for alias1', async function () {
      const expectedHitCount = '4';
      await PageObjects.common.navigateToApp('discover');
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });


    it('should be able to create index pattern alias2: with timefield', async function () {
      log.debug('create alias2 index pattern');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('alias2', 'date');
      const indexPageHeading = await PageObjects.settings.getIndexPageHeading();
      const patternName = await indexPageHeading.getVisibleText();
      expect(patternName).to.be('alias2*');
    });


    it('should be able to discover and verify no of hits for alias2', async function () {
      const expectedHitCount = '5';
      const fromTime = '2016-11-12 05:00:00.000';
      const toTime = '2016-11-19 05:00:00.000';

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('alias2');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });





  });
}
