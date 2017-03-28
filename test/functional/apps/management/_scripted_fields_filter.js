
import expect from 'expect.js';

import {
  bdd,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';


bdd.describe('filter scripted fields', function describeIndexTests() {

  bdd.beforeEach(async function () {
    await PageObjects.remote.setWindowSize(1200,800);
    // delete .kibana index and then wait for Kibana to re-create it
    await esClient.deleteAndUpdateConfigDoc({ 'dateFormat:tz':'UTC' });
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.createIndexPattern();
    await esClient.updateConfigDoc({ 'dateFormat:tz':'UTC' });
  });

  const scriptedExpressionFieldName = 'ram_expr1';
  const scriptedPainlessFieldName = 'ram_pain1';

  bdd.it('should filter scripted fields', async function () {
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.clickScriptedFieldsTab();
    const scriptedFieldLangsBefore = await PageObjects.settings.getScriptedFieldLangs();
    await PageObjects.common.debug('add scripted field');
    await PageObjects.settings
      .addScriptedField(scriptedExpressionFieldName,
        'expression', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
      );
    await PageObjects.settings
      .addScriptedField(scriptedPainlessFieldName,
        'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
      );

    // confirm two additional scripted fields were created
    await PageObjects.common.try(async function() {
      const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
      expect(scriptedFieldLangs.length).to.be(scriptedFieldLangsBefore.length + 2);
    });

    await PageObjects.settings.setScriptedFieldLanguageFilter('painless');

    await PageObjects.common.try(async function() {
      const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
      expect(scriptedFieldLangs.length).to.be.above(0);
      for (const lang of scriptedFieldLangs) {
        expect(lang).to.be('painless');
      }
    });

    await PageObjects.settings.setScriptedFieldLanguageFilter('expression');

    await PageObjects.common.try(async function() {
      const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
      expect(scriptedFieldLangs.length).to.be.above(0);
      for (const lang of scriptedFieldLangs) {
        expect(lang).to.be('expression');
      }
    });
  });

});
