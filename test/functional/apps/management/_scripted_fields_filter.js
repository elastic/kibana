import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const log = getService('log');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['settings']);

  describe('filter scripted fields', function describeIndexTests() {

    beforeEach(async function () {
      await remote.setWindowSize(1200,800);
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz':'UTC' });
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({ 'dateFormat:tz':'UTC' });
    });

    const scriptedExpressionFieldName = 'ram_expr1';
    const scriptedPainlessFieldName = 'ram_pain1';

    it('should filter scripted fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickScriptedFieldsTab();
      const scriptedFieldLangsBefore = await PageObjects.settings.getScriptedFieldLangs();
      await log.debug('add scripted field');
      await PageObjects.settings
      .addScriptedField(scriptedExpressionFieldName,
        'expression', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
      );
      await PageObjects.settings
      .addScriptedField(scriptedPainlessFieldName,
        'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
      );

      // confirm two additional scripted fields were created
      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be(scriptedFieldLangsBefore.length + 2);
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('painless');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('painless');
        }
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('expression');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('expression');
        }
      });
    });

  });
}
