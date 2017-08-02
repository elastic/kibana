import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  const FIELD_NAME = 'machine.os.raw';

  describe('visualize control app', function describeIndexTests() {
    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickTermsControl();
      await PageObjects.visualize.setReactSelect('.index-pattern-react-select', 'logstash-*');
      await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
      await PageObjects.visualize.setReactSelect('.field-react-select', FIELD_NAME);
      await PageObjects.visualize.clickGo();

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('terms control visualization', function indexPatternCreation() {

      it('should contain dropdown with terms aggregation results as options', async () => {
        const menu = await PageObjects.visualize.getReactSelectOptions('.terms-select');
        expect(menu.trim().split('\n').join()).to.equal('win 8,win xp,win 7,ios,osx');
      });

      it('should add filter pill when item selected', async function () {
        const term = 'ios';
        await PageObjects.visualize.setReactSelect('.terms-select', term);

        const dropdownValue = await PageObjects.visualize.getReactSelectValue('.terms-select');
        expect(dropdownValue).to.equal(term);

        const hasFilter = await filterBar.hasFilter(FIELD_NAME, term);
        expect(hasFilter).to.equal(true);
      });

      it('should clear dropdown when filter pill removed', async function () {
        const term = 'ios';
        await PageObjects.visualize.setReactSelect('.terms-select', term);

        await filterBar.removeFilter(FIELD_NAME);
        await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

        const hasValue = await PageObjects.visualize.doesReactSelectHaveValue('.terms-select');
        expect(hasValue).to.equal(false);
      });

      it('should replace existing filter pill(s) when new item is selected', async function () {
        const term = 'ios';
        await PageObjects.visualize.setReactSelect('.terms-select', term);

        const newTerm = 'osx';
        await PageObjects.visualize.setReactSelect('.terms-select', newTerm);

        const hasOldFilter = await filterBar.hasFilter(FIELD_NAME, term);
        const hasNewFilter = await filterBar.hasFilter(FIELD_NAME, newTerm);
        expect(hasOldFilter).to.equal(false);
        expect(hasNewFilter).to.equal(true);
      });
    });
  });
}
