import expect from 'expect.js';
import path from 'path';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header']);

  describe('import objects', function describeIndexTests() {
    beforeEach(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await esArchiver.load('management');
    });

    afterEach(async function () {
      await esArchiver.unload('management');
    });

    it('should import saved objects normally', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });

    it('should import conflicts using a confirm modal', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects-conflicts.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickChangeIndexConfirmButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(rowCount).to.be(2);
    });

    it('should allow for overrides', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();

      // Put in data which already exists
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_exists.json'));
      // Say we want to be asked
      await PageObjects.common.clickCancelOnModal();
      // Interact with the conflict modal
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickChangeIndexConfirmButton();
      // Now confirm we want to override
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(rowCount).to.be(1);
    });

    it('should allow for cancelling overrides', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();

      // Put in data which already exists
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_exists.json'));
      // Say we want to be asked
      await PageObjects.common.clickCancelOnModal();
      // Interact with the conflict modal
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickChangeIndexConfirmButton();
      // Now cancel the override
      await PageObjects.common.clickCancelOnModal();

      await PageObjects.settings.clickVisualizationsTab();
      const rowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(rowCount).to.be(1);
    });

    it('should handle saved searches and objects with saved searches properly', async function () {
      // First, import the saved search
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_saved_search.json'));
      await PageObjects.common.clickConfirmOnModal();

      // Second, we need to delete the index pattern
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickOnOnlyIndexPattern();
      await PageObjects.settings.removeIndexPattern();

      // Last, import a saved object connected to the saved search
      // This should NOT show the modal
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.json'));
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.settings.clickVisualizationsTab();
      const vizRowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(vizRowCount).to.be(1);

      await PageObjects.settings.clickSearchesTab();
      const searchRowCount = await retry.try(async () => {
        const rows = await PageObjects.settings.getVisualizationRows();
        return rows.length;
      });
      expect(searchRowCount).to.be(1);
    });
  });
}
