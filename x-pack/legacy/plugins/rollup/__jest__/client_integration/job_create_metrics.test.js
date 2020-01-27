/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';

jest.mock('ui/new_platform');

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 5: Metrics', () => {
  let server;
  let httpRequestsMockHelpers;
  let find;
  let exists;
  let actions;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let table;
  let metrics;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setIndexPatternValidityResponse();

    ({ find, exists, actions, getEuiStepsHorizontalActive, goToStep, table, metrics } = setup());
  });

  const numericFields = ['a-numericField', 'c-numericField'];
  const dateFields = ['b-dateField', 'd-dateField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(5);
    find('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(5);
    });

    it('should have the horizontal step active on "Metrics"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });

    it('should have the title set to "Metrics"', () => {
      expect(exists('rollupJobCreateMetricsTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(exists('rollupJobCreateMetricsDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(exists('rollupJobBackButton')).toBe(true);
      expect(exists('rollupJobNextButton')).toBe(true);
      expect(exists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Histogram" step when clicking the back button', async () => {
      actions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should go to the "Review" step when clicking the next button', async () => {
      actions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Review');
    });

    it('should have a button to display the list of metrics fields to chose from', () => {
      expect(exists('rollupJobMetricsFieldChooser')).toBe(false);

      find('rollupJobShowFieldChooserButton').simulate('click');

      expect(exists('rollupJobMetricsFieldChooser')).toBe(true);
    });
  });

  describe('metrics field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add metrics fields"', async () => {
        expect(find('rollupJobCreateFlyoutTitle').text()).toEqual('Add metrics fields');
      });

      it('should have a button to close the flyout', () => {
        expect(exists('rollupJobMetricsFieldChooser')).toBe(true);

        find('euiFlyoutCloseButton').simulate('click');

        expect(exists('rollupJobMetricsFieldChooser')).toBe(false);
      });
    });

    describe('table', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the fields with metrics and its type', async () => {
        const { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField', 'numeric'],
          ['b-dateField', 'date'],
          ['c-numericField', 'numeric'],
          ['d-dateField', 'date'],
        ]);
      });

      it('should add metric field to the field list when clicking on a row', () => {
        let { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList');
        expect(tableCellsValues).toEqual([['No metrics fields added']]); // make sure the field list is empty

        const { rows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row in field chooser

        ({ tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList'));
        const [firstRow] = tableCellsValues;
        const [field, type] = firstRow;
        expect(field).toEqual(rows[0].columns[0].value);
        expect(type).toEqual(rows[0].columns[1].value);
      });
    });
  });

  describe('fields list', () => {
    const addFieldToList = (type = 'numeric') => {
      if (!exists('rollupJobMetricsFieldChooser-table')) {
        find('rollupJobShowFieldChooserButton').simulate('click');
      }
      const { rows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].columns[1].value === type) {
          rows[i].reactWrapper.simulate('click');
          break;
        }
      }
    };

    const numericTypeMetrics = ['avg', 'max', 'min', 'sum', 'value_count'];
    const dateTypeMetrics = ['max', 'min', 'value_count'];

    it('should have an empty field list', async () => {
      await goToStep(5);

      const { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList');
      expect(tableCellsValues).toEqual([['No metrics fields added']]);
    });

    describe('when fields are added', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should have "avg", "max", "min", "sum" & "value count" metrics for *numeric* fields', () => {
        addFieldToList('numeric');
        numericTypeMetrics.forEach(type => {
          try {
            expect(exists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch (e) {
            throw new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`);
          }
        });

        // Make sure there are no other checkboxes
        const {
          rows: [firstRow],
        } = table.getMetaData('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find(
          'input'
        );
        expect(metricsCheckboxes.length).toBe(
          numericTypeMetrics.length + 1 /* add one for select all */
        );
      });

      it('should have "max", "min", & "value count" metrics for *date* fields', () => {
        addFieldToList('date');

        dateTypeMetrics.forEach(type => {
          try {
            expect(exists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch (e) {
            throw new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`);
          }
        });

        // Make sure there are no other checkboxes
        const {
          rows: [firstRow],
        } = table.getMetaData('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find(
          'input'
        );
        expect(metricsCheckboxes.length).toBe(
          dateTypeMetrics.length + 1 /* add one for select all */
        );
      });

      it('should not allow to go to the next step if at least one metric type is not selected', () => {
        expect(exists('rollupJobCreateStepError')).toBeFalsy();

        addFieldToList('numeric');
        actions.clickNextStep();

        const stepError = find('rollupJobCreateStepError');
        expect(stepError.length).toBeTruthy();
        expect(stepError.text()).toEqual(
          'Select metrics types for these fields or remove them: a-numericField.'
        );
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should have a delete button on each row to remove the metric field', async () => {
        const { rows: fieldChooserRows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
        fieldChooserRows[0].reactWrapper.simulate('click'); // select first item

        // Make sure rows value has been set
        let { rows: fieldListRows } = table.getMetaData('rollupJobMetricsFieldList');
        expect(fieldListRows[0].columns[0].value).not.toEqual('No metrics fields added');

        const columnsFirstRow = fieldListRows[0].columns;
        // The last column is the eui "actions" column
        const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper
          .find('button')
          .last();
        deleteButton.simulate('click');

        ({ rows: fieldListRows } = table.getMetaData('rollupJobMetricsFieldList'));
        expect(fieldListRows[0].columns[0].value).toEqual('No metrics fields added');
      });
    });

    describe('when using multi-selectors', () => {
      let getSelectAllInputForRow;
      let getFieldChooserColumnForRow;
      let getFieldListTableRows;

      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStep(5);
        await addFieldToList('numeric');
        await addFieldToList('date');
        find('rollupJobSelectAllMetricsPopoverButton').simulate('click');
        ({ getSelectAllInputForRow, getFieldChooserColumnForRow, getFieldListTableRows } = metrics);
      });

      const expectAllFieldChooserInputs = (fieldChooserColumn, expected) => {
        const inputs = fieldChooserColumn.reactWrapper.find('input');
        inputs.forEach(input => {
          expect(input.props().checked).toBe(expected);
        });
      };

      it('should select all of the fields in a row', async () => {
        // The last column is the eui "actions" column
        const selectAllCheckbox = getSelectAllInputForRow(0);
        selectAllCheckbox.simulate('change', { checked: true });
        const fieldChooserColumn = getFieldChooserColumnForRow(0);
        expectAllFieldChooserInputs(fieldChooserColumn, true);
      });

      it('should deselect all of the fields in a row ', async () => {
        const selectAllCheckbox = getSelectAllInputForRow(0);
        selectAllCheckbox.simulate('change', { checked: true });

        let fieldChooserColumn = getFieldChooserColumnForRow(0);
        expectAllFieldChooserInputs(fieldChooserColumn, true);

        selectAllCheckbox.simulate('change', { checked: false });
        fieldChooserColumn = getFieldChooserColumnForRow(0);
        expectAllFieldChooserInputs(fieldChooserColumn, false);
      });

      it('should select all of the metric types across rows (column-wise)', () => {
        const selectAllAvgCheckbox = find('rollupJobMetricsSelectAllCheckbox-avg');
        selectAllAvgCheckbox.first().simulate('change', { checked: true });

        const rows = getFieldListTableRows();

        rows
          .filter(row => {
            const [, metricTypeCol] = row.columns;
            return metricTypeCol.value === 'numeric';
          })
          .forEach((row, idx) => {
            const fieldChooser = getFieldChooserColumnForRow(idx);
            fieldChooser.reactWrapper.find('input').forEach(input => {
              const props = input.props();
              if (props['data-test-subj'].endsWith('avg')) {
                expect(props.checked).toBe(true);
              } else {
                expect(props.checked).toBe(false);
              }
            });
          });
      });

      it('should deselect all of the metric types across rows (column-wise)', () => {
        const selectAllAvgCheckbox = find('rollupJobMetricsSelectAllCheckbox-avg');

        // Select first, which adds metrics column-wise, and then de-select column-wise to ensure
        // that we correctly remove/undo our adding action.
        selectAllAvgCheckbox.last().simulate('change', { checked: true });
        selectAllAvgCheckbox.last().simulate('change', { checked: false });

        const rows = getFieldListTableRows();

        rows.forEach((row, idx) => {
          const [, metricTypeCol] = row.columns;
          if (metricTypeCol.value !== 'numeric') {
            return;
          }
          const fieldChooser = getFieldChooserColumnForRow(idx);
          fieldChooser.reactWrapper.find('input').forEach(input => {
            expect(input.props().checked).toBe(false);
          });
        });
      });

      it('should correctly select across rows and columns', async () => {
        /**
         * Tricky test case where we want to determine that the column-wise and row-wise
         * selections are interacting correctly with each other.
         *
         * We will select avg (numeric) and max (numeric + date) to ensure that we are
         * testing across metrics types too. The plan is:
         *
         * 1. Select all avg column-wise
         * 2. Select all max column-wise
         * 3. Select and deselect row-wise the first numeric metric row. Because some items will
         *    have been selected by the previous column-wise selection we want to test that row-wise
         *    select all followed by de-select can effectively undo the column-wise selections.
         * 4. Expect the avg and max select all checkboxes to be unchecked
         * 5. Select all on the last date metric row-wise
         * 6. Select then deselect all max column-wise
         * 7. Expect everything but all and max to be selected on the last date metric row
         *
         * Let's a go!
         */

        // 1.
        find('rollupJobMetricsSelectAllCheckbox-avg')
          .first()
          .simulate('change', { checked: true });
        // 2.
        find('rollupJobMetricsSelectAllCheckbox-max')
          .first()
          .simulate('change', { checked: true });

        const selectAllCheckbox = getSelectAllInputForRow(0);

        // 3.
        // Select all (which should check all checkboxes)
        selectAllCheckbox.simulate('change', { checked: true });
        // Deselect all (which should deselect all checkboxes)
        selectAllCheckbox.simulate('change', { checked: false });

        // 4.
        expect(
          find('rollupJobMetricsSelectAllCheckbox-avg')
            .first()
            .props().checked
        ).toBe(false);
        expect(
          find('rollupJobMetricsSelectAllCheckbox-max')
            .first()
            .props().checked
        ).toBe(false);

        let rows = getFieldListTableRows();
        // 5.
        getSelectAllInputForRow(rows.length - 1).simulate('change', { checked: true });

        // 6.
        find('rollupJobMetricsSelectAllCheckbox-max')
          .first()
          .simulate('change', { checked: true });
        find('rollupJobMetricsSelectAllCheckbox-max')
          .first()
          .simulate('change', { checked: false });

        rows = getFieldListTableRows();
        const lastRowFieldChooserColumn = getFieldChooserColumnForRow(rows.length - 1);
        // 7.
        lastRowFieldChooserColumn.reactWrapper.find('input').forEach(input => {
          const props = input.props();
          if (props['data-test-subj'].endsWith('max') || props['data-test-subj'].endsWith('All')) {
            expect(props.checked).toBe(false);
          } else {
            expect(props.checked).toBe(true);
          }
        });
      });
    });
  });
});
