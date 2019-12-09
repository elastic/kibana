/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';

jest.mock('ui/new_platform');

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 3: Terms', () => {
  let server;
  let httpRequestsMockHelpers;
  let find;
  let exists;
  let actions;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let table;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setIndexPatternValidityResponse();

    ({
      find,
      exists,
      actions,
      getEuiStepsHorizontalActive,
      goToStep,
      table,
    } = setup());
  });

  const numericFields = ['a-numericField', 'c-numericField'];
  const keywordFields =  ['b-keywordField', 'd-keywordField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(3);
    find('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(3);
    });

    it('should have the horizontal step active on "Terms"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Terms');
    });

    it('should have the title set to "Terms"', () => {
      expect(exists('rollupJobCreateTermsTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(exists('rollupJobCreateTermsDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(exists('rollupJobBackButton')).toBe(true);
      expect(exists('rollupJobNextButton')).toBe(true);
      expect(exists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Date histogram" step when clicking the back button', async () => {
      actions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Date histogram');
    });

    it('should go to the "Histogram" step when clicking the next button', async () => {
      actions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should have a button to display the list of terms to chose from', () => {
      expect(exists('rollupJobTermsFieldChooser')).toBe(false);

      find('rollupJobShowFieldChooserButton').simulate('click');

      expect(exists('rollupJobTermsFieldChooser')).toBe(true);
    });
  });

  describe('terms field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add terms fields"', async () => {
        expect(find('rollupJobCreateFlyoutTitle').text()).toEqual('Add terms fields');
      });

      it('should have a button to close the flyout', () => {
        expect(exists('rollupJobTermsFieldChooser')).toBe(true);

        find('euiFlyoutCloseButton').simulate('click');

        expect(exists('rollupJobTermsFieldChooser')).toBe(false);
      });
    });

    describe('when no terms are available', () => {
      it('should indicate it to the user', async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields: [], keywordFields: [] });
        await goToStepAndOpenFieldChooser();

        const { tableCellsValues } = table.getMetaData('rollupJobTermsFieldChooser-table');

        expect(tableCellsValues).toEqual([['No items found']]);
      });
    });

    describe('when terms are available', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, keywordFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the numeric & keyword fields available', async () => {
        const { tableCellsValues } = table.getMetaData('rollupJobTermsFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField', 'numeric'],
          ['b-keywordField', 'keyword'],
          ['c-numericField', 'numeric'],
          ['d-keywordField', 'keyword'],
        ]);
      });

      it('should add term to the field list when clicking on it', () => {
        let { tableCellsValues } = table.getMetaData('rollupJobTermsFieldList');
        expect(tableCellsValues).toEqual([['No terms fields added']]); // make sure the field list is empty

        const { rows } = table.getMetaData('rollupJobTermsFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row

        ({ tableCellsValues } = table.getMetaData('rollupJobTermsFieldList'));
        const [firstRow] = tableCellsValues;
        const [term, type] = firstRow;
        expect(term).toEqual('a-numericField');
        expect(type).toEqual('numeric');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep(3);

      const { tableCellsValues } = table.getMetaData('rollupJobTermsFieldList');
      expect(tableCellsValues).toEqual([['No terms fields added']]);
    });

    it('should have a delete button on each row to remove a term', async () => {
      // First let's add a term to the list
      httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, keywordFields });
      await goToStepAndOpenFieldChooser();
      const { rows: fieldChooserRows } = table.getMetaData('rollupJobTermsFieldChooser-table');
      fieldChooserRows[0].reactWrapper.simulate('click');

      // Make sure rows value has been set
      let { rows: fieldListRows } = table.getMetaData('rollupJobTermsFieldList');
      expect(fieldListRows[0].columns[0].value).not.toEqual('No terms fields added');

      const columnsFirstRow = fieldListRows[0].columns;
      // The last column is the eui "actions" column
      const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
      deleteButton.simulate('click');

      ({ rows: fieldListRows } = table.getMetaData('rollupJobTermsFieldList'));
      expect(fieldListRows[0].columns[0].value).toEqual('No terms fields added');
    });
  });
});
