export function VisualizeListingTableProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);

  class VisualizeListingTable {
    async getAllVisualizationNamesOnCurrentPage() {
      const visualizationNames = [];
      const links = await find.allByCssSelector('.kuiLink');
      for (let i = 0; i < links.length; i++) {
        visualizationNames.push(await links[i].getVisibleText());
      }
      log.debug(`Found ${visualizationNames.length} visualizations on current page`);
      return visualizationNames;
    }

    async getAllVisualizationNames() {
      log.debug('VisualizeListingTable.getAllVisualizationNames');
      let morePages = true;
      let visualizationNames = [];
      while (morePages) {
        visualizationNames = visualizationNames.concat(await this.getAllVisualizationNamesOnCurrentPage());
        const pagerNextButton = await testSubjects.find('pagerNextButton');
        morePages = !(await pagerNextButton.getProperty('disabled'));
        if (morePages) {
          await testSubjects.click('pagerNextButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      }
      return visualizationNames;
    }
  }

  return new VisualizeListingTable();
}
