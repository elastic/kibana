import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const testSubjects = getService('testSubjects');

  const FIELD_NAME = 'machine.os.raw';

  describe('visualize control app', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickInputControlVis();
      await PageObjects.visualize.addInputControl();
      await PageObjects.visualize.setReactSelect('.index-pattern-react-select', 'logstash-*');
      await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
      await PageObjects.visualize.setReactSelect('.field-react-select', FIELD_NAME);
      await PageObjects.visualize.clickGo();

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('input control visualization', () => {

      describe('updateFiltersOnChange is false', () => {

        it('should contain dropdown with terms aggregation results as options', async () => {
          const menu = await PageObjects.visualize.getReactSelectOptions('inputControl0');
          expect(menu.trim().split('\n').join()).to.equal('win 8,win xp,win 7,ios,osx');
        });

        it('should display staging control buttons', async () => {
          await testSubjects.exists('inputControlSubmitBtn');
          await testSubjects.exists('inputControlCancelBtn');
          await testSubjects.exists('inputControlClearBtn');
        });

        it('should stage filter when item selected', async () => {
          await PageObjects.visualize.setReactSelect('.list-control-react-select', 'ios');

          const dropdownValue = await PageObjects.visualize.getReactSelectValue('.list-control-react-select');
          expect(dropdownValue.trim()).to.equal('ios');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(false);
        });

        it('should add filter pill when submit button is clicked', async () => {
          await testSubjects.click('inputControlSubmitBtn');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(true);
        });

        it('should replace existing filter pill(s) when new item is selected', async () => {
          await PageObjects.visualize.clearReactSelect('.list-control-react-select');
          await PageObjects.visualize.setReactSelect('.list-control-react-select', 'osx');
          await testSubjects.click('inputControlSubmitBtn');

          const hasOldFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          const hasNewFilter = await filterBar.hasFilter(FIELD_NAME, 'osx');
          expect(hasOldFilter).to.equal(false);
          expect(hasNewFilter).to.equal(true);
        });

        it('should clear dropdown when filter pill removed', async () => {
          await filterBar.removeFilter(FIELD_NAME);
          await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

          const hasValue = await PageObjects.visualize.doesReactSelectHaveValue('.list-control-react-select');
          expect(hasValue).to.equal(false);
        });

        it('should remove filters when Clear button is clicked', async () => {
          await PageObjects.visualize.setReactSelect('.list-control-react-select', 'ios');
          await testSubjects.click('inputControlSubmitBtn');
          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(true);

          await testSubjects.click('inputControlClearBtn');
          await PageObjects.common.sleep(500); // give time for filters to be removed
          const hasFilterAfterClear = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilterAfterClear).to.equal(false);
        });
      });
    });
  });
}
