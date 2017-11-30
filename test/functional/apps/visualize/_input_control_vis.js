import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const testSubjects = getService('testSubjects');

  const FIELD_NAME = 'machine.os.raw';

  describe('visualize app', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickInputControlVis();
      await PageObjects.visualize.clickVisEditorTab('controls');
      await PageObjects.visualize.addInputControl();
      await PageObjects.visualize.setReactSelect('.index-pattern-react-select', 'logstash');
      await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
      await PageObjects.visualize.setReactSelect('.field-react-select', FIELD_NAME);
      await PageObjects.visualize.clickGo();

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('input control visualization', () => {

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      describe('updateFiltersOnChange is false', () => {

        it('should contain dropdown with terms aggregation results as options', async () => {
          const menu = await PageObjects.visualize.getReactSelectOptions('inputControl0');
          expect(menu.trim().split('\n').join()).to.equal('win 8,win xp,win 7,ios,osx');
        });

        it('should display staging control buttons', async () => {
          const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
          const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
          const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
          expect(submitButtonExists).to.equal(true);
          expect(cancelButtonExists).to.equal(true);
          expect(clearButtonExists).to.equal(true);
        });

        it('should stage filter when item selected but not create filter pill', async () => {
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

        it('should clear form when Clear button is clicked but not remove filter pill', async () => {
          await PageObjects.visualize.setReactSelect('.list-control-react-select', 'ios');
          await testSubjects.click('inputControlSubmitBtn');
          const hasFilterBeforeClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilterBeforeClearBtnClicked).to.equal(true);

          await testSubjects.click('inputControlClearBtn');
          const hasValue = await PageObjects.visualize.doesReactSelectHaveValue('.list-control-react-select');
          expect(hasValue).to.equal(false);

          const hasFilterAfterClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilterAfterClearBtnClicked).to.equal(true);
        });

        it('should remove filter pill when cleared form is submitted', async () => {
          await testSubjects.click('inputControlSubmitBtn');
          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(false);
        });
      });

      describe('updateFiltersOnChange is true', () => {
        before(async () => {
          await PageObjects.visualize.clickVisEditorTab('options');
          await PageObjects.visualize.checkCheckbox('inputControlEditorUpdateFiltersOnChangeCheckbox');
          await PageObjects.visualize.clickGo();

          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        after(async () => {
          await PageObjects.visualize.clickVisEditorTab('options');
          await PageObjects.visualize.uncheckCheckbox('inputControlEditorUpdateFiltersOnChangeCheckbox');
          await PageObjects.visualize.clickGo();

          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        it('should not display staging control buttons', async () => {
          const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
          const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
          const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
          expect(submitButtonExists).to.equal(false);
          expect(cancelButtonExists).to.equal(false);
          expect(clearButtonExists).to.equal(false);
        });

        it('should add filter pill when item selected', async () => {
          await PageObjects.visualize.setReactSelect('.list-control-react-select', 'ios');

          const dropdownValue = await PageObjects.visualize.getReactSelectValue('.list-control-react-select');
          expect(dropdownValue.trim()).to.equal('ios');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(true);
        });
      });
    });
  });
}
