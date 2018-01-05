
import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const log = getService('log');
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['settings']);

  describe('filter scripted fields', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await remote.setWindowSize(1200, 800);
      await esArchiver.load('management');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'f1e4c910-a2e6-11e7-bb30-233be9be6a15'
      });
    });

    after(async function () {
      await esArchiver.unload('management');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
    });

    const scriptedPainlessFieldName = 'ram_pain1';

    it('should filter scripted fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickScriptedFieldsTab();
      const scriptedFieldLangsBefore = await PageObjects.settings.getScriptedFieldLangs();
      await log.debug('add scripted field');

      // The expression scripted field has been pre-created in the management esArchiver pack since it is no longer
      // possible to create an expression script via the UI
      await PageObjects.settings
        .addScriptedField(scriptedPainlessFieldName,
          'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
        );

      // confirm two additional scripted fields were created
      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be(scriptedFieldLangsBefore.length + 1);
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
