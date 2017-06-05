import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);

  describe('index pattern filter', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      })
      .then(function () {
        return PageObjects.settings.clickKibanaIndices();
      });
    });

    beforeEach(function () {
      return PageObjects.settings.createIndexPattern();
    });

    afterEach(function () {
      return PageObjects.settings.removeIndexPattern();
    });

    it('should filter indexed fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.getFieldTypes();

      await PageObjects.settings.setFieldTypeFilter('string');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('string');
        }
      });

      await PageObjects.settings.setFieldTypeFilter('number');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('number');
        }
      });
    });
  });
}
