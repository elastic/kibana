/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';

jest.mock('ui/new_platform');

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 4: Histogram', () => {
  let server;
  let httpRequestsMockHelpers;
  let find;
  let exists;
  let actions;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let table;
  let form;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setIndexPatternValidityResponse();

    ({ find, exists, actions, getEuiStepsHorizontalActive, goToStep, table, form } = setup());
  });

  const numericFields = ['a-numericField', 'b-numericField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(4);
    find('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(4);
    });

    it('should have the horizontal step active on "Histogram"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should have the title set to "Terms"', () => {
      expect(exists('rollupJobCreateHistogramTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(exists('rollupJobCreateHistogramDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(exists('rollupJobBackButton')).toBe(true);
      expect(exists('rollupJobNextButton')).toBe(true);
      expect(exists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Terms" step when clicking the back button', async () => {
      actions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Terms');
    });

    it('should go to the "Metrics" step when clicking the next button', async () => {
      actions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });

    it('should have a button to display the list of histogram fields to chose from', () => {
      expect(exists('rollupJobHistogramFieldChooser')).toBe(false);

      find('rollupJobShowFieldChooserButton').simulate('click');

      expect(exists('rollupJobHistogramFieldChooser')).toBe(true);
    });
  });

  describe('histogram field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add histogram fields"', async () => {
        expect(find('rollupJobCreateFlyoutTitle').text()).toEqual('Add histogram fields');
      });

      it('should have a button to close the flyout', () => {
        expect(exists('rollupJobHistogramFieldChooser')).toBe(true);

        find('euiFlyoutCloseButton').simulate('click');

        expect(exists('rollupJobHistogramFieldChooser')).toBe(false);
      });
    });

    describe('when no histogram fields are availalbe', () => {
      it('should indicate it to the user', async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields: [] });
        await goToStepAndOpenFieldChooser();

        const { tableCellsValues } = table.getMetaData('rollupJobHistogramFieldChooser-table');

        expect(tableCellsValues).toEqual([['No items found']]);
      });
    });

    describe('when histogram fields are available', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the histogram fields available', async () => {
        const { tableCellsValues } = table.getMetaData('rollupJobHistogramFieldChooser-table');

        expect(tableCellsValues).toEqual([['a-numericField'], ['b-numericField']]);
      });

      it('should add histogram field to the field list when clicking on it', () => {
        let { tableCellsValues } = table.getMetaData('rollupJobHistogramFieldList');
        expect(tableCellsValues).toEqual([['No histogram fields added']]); // make sure the field list is empty

        const { rows } = table.getMetaData('rollupJobHistogramFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row

        ({ tableCellsValues } = table.getMetaData('rollupJobHistogramFieldList'));
        const [firstRow] = tableCellsValues;
        expect(firstRow[0]).toEqual('a-numericField');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep(4);

      const { tableCellsValues } = table.getMetaData('rollupJobHistogramFieldList');
      expect(tableCellsValues).toEqual([['No histogram fields added']]);
    });

    it('should have a delete button on each row to remove an histogram field', async () => {
      // First let's add a term to the list
      httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields });
      await goToStepAndOpenFieldChooser();
      const { rows: fieldChooserRows } = table.getMetaData('rollupJobHistogramFieldChooser-table');
      fieldChooserRows[0].reactWrapper.simulate('click');

      // Make sure rows value has been set
      let { rows: fieldListRows } = table.getMetaData('rollupJobHistogramFieldList');
      expect(fieldListRows[0].columns[0].value).not.toEqual('No histogram fields added');

      const columnsFirstRow = fieldListRows[0].columns;
      // The last column is the eui "actions" column
      const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
      deleteButton.simulate('click');

      ({ rows: fieldListRows } = table.getMetaData('rollupJobHistogramFieldList'));
      expect(fieldListRows[0].columns[0].value).toEqual('No histogram fields added');
    });
  });

  describe('interval', () => {
    const addHistogramFieldToList = () => {
      find('rollupJobShowFieldChooserButton').simulate('click');
      const { rows } = table.getMetaData('rollupJobHistogramFieldChooser-table');
      rows[0].reactWrapper.simulate('click');
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields });
      await goToStep(4);
      addHistogramFieldToList();
    });

    describe('input validation', () => {
      afterEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should display errors when clicking "next" without filling the interval', () => {
        expect(exists('rollupJobCreateStepError')).toBeFalsy();

        actions.clickNextStep();

        expect(exists('rollupJobCreateStepError')).toBeTruthy();
        expect(form.getErrorsMessages()).toEqual(['Interval must be a whole number.']);
      });

      it('should be a whole number', () => {
        form.setInputValue('rollupJobCreateHistogramInterval', 5.5);
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toEqual(['Interval must be a whole number.']);
      });

      it('should be greater than zero', () => {
        form.setInputValue('rollupJobCreateHistogramInterval', -1);
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toEqual(['Interval must be greater than zero.']);
      });
    });

    it('should go to next "Metrics" step if value is valid', () => {
      form.setInputValue('rollupJobCreateHistogramInterval', 3);
      actions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });
  });
});
