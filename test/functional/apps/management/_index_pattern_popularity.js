import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result popularity', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      });
    });

    beforeEach(function be() {
      return PageObjects.settings.createIndexPattern();
    });

    afterEach(function ae() {
      return PageObjects.settings.removeIndexPattern();
    });

    describe('change popularity', function indexPatternCreation() {
      const fieldName = 'geo.coordinates';

      // set the page size to All again, https://github.com/elastic/kibana/issues/5030
      // TODO: remove this after issue #5030 is closed
      async function fix5030() {
        await PageObjects.settings.setPageSize('All');
        await PageObjects.common.sleep(1000);
      }

      beforeEach(async function () {
        // increase Popularity of geo.coordinates
        await PageObjects.settings.setPageSize('All');
        await PageObjects.common.sleep(1000);
        log.debug('Starting openControlsByName (' + fieldName + ')');
        await PageObjects.settings.openControlsByName(fieldName);
        log.debug('increasePopularity');
        await PageObjects.settings.increasePopularity();
      });

      afterEach(async function () {
        // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
        await PageObjects.settings.controlChangeCancel();
      });

      it('should update the popularity input', async function () {
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
        screenshots.take('Settings-indices-result-popularity-updated');
      });

      it('should be reset on cancel', async function () {
        // Cancel saving the popularity change
        await PageObjects.settings.controlChangeCancel();
        await fix5030();
        await PageObjects.settings.openControlsByName(fieldName);
        // check that it is 0 (previous increase was cancelled
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('0');
      });

      it('can be saved', async function () {
        // Saving the popularity change
        await PageObjects.settings.controlChangeSave();
        await fix5030();
        await PageObjects.settings.openControlsByName(fieldName);
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
        screenshots.take('Settings-indices-result-popularity-saved');
      });
    }); // end 'change popularity'
  }); // end index result popularity
}
