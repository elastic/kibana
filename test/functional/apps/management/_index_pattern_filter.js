
import expect from 'expect.js';

import {
  bdd,
  defaultTimeout,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('index pattern filter', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickKibanaIndicies();
    });
  });

  bdd.beforeEach(function () {
    return PageObjects.settings.createIndexPattern();
  });

  bdd.afterEach(function () {
    return PageObjects.settings.removeIndexPattern();
  });

  bdd.it('should filter indexed fields', async function () {
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    const fieldTypesBefore = await PageObjects.settings.getFieldTypes();


    await PageObjects.settings.setFieldTypeFilter('string');

    await PageObjects.common.try(async function() {
      const fieldTypes = await PageObjects.settings.getFieldTypes();
      expect(fieldTypes.length).to.be.above(0);
      for (const fieldType of fieldTypes) {
        expect(fieldType).to.be('string');
      }
    });

    await PageObjects.settings.setFieldTypeFilter('number');

    await PageObjects.common.try(async function() {
      const fieldTypes = await PageObjects.settings.getFieldTypes();
      expect(fieldTypes.length).to.be.above(0);
      for (const fieldType of fieldTypes) {
        expect(fieldType).to.be('number');
      }
    });
  });
});
