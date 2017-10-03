import expect from 'expect.js';
import path from 'path';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('import objects', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await esArchiver.load('visualize');
    });

    after(async function () {
      await esArchiver.unload('visualize');
    });

    it('should import saved objects normally', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        if (rows.length !== 2) {
          throw 'Not loaded yet';
        }
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });

    it('should import conflicts using a confirm modal', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects-conflicts.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickChangeIndexConfirmButton();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        if (rows.length !== 2) {
          throw 'Not loaded yet';
        }
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });

    it('should allow for overrides', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        if (rows.length !== 2) {
          throw 'Not loaded yet';
        }
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });

    it('should allow for cancelling overrides', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickCancelOnModal(true);
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        if (rows.length !== 2) {
          throw 'Not loaded yet';
        }
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });
  });
}
