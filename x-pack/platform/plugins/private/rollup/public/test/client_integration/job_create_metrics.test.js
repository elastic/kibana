/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@elastic/eui', () => {
  // We only override EuiPopover to avoid MutationObserver-based act warnings in JSDOM.
  const React = require('react');
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiPopover: ({ button, isOpen, children }) => (
      <React.Fragment>
        {button}
        {isOpen ? children : null}
      </React.Fragment>
    ),
  };
});

import { mockHttpRequest, renderJobCreate } from './helpers';
import { setHttp, init as initDocumentation } from '../../crud_app/services';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';

describe('Create Rollup Job, step 5: Metrics', () => {
  const numericFields = ['a-numericField', 'c-numericField'];
  const dateFields = ['b-dateField', 'd-dateField'];
  const numericTypeMetrics = ['avg', 'max', 'min', 'sum', 'value_count'];
  const dateTypeMetrics = ['max', 'min', 'value_count'];

  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));
  const clickBack = () => fireEvent.click(screen.getByTestId('rollupJobBackButton'));

  const goToStep5 = async () => {
    // Step 1
    setInputValue('rollupJobName', 'test-job');
    setInputValue('rollupIndexPattern', 'kibana*');
    setInputValue('rollupIndexName', 'rollup-index');
    await screen.findByTestId('fieldIndexPatternSuccessMessage');
    clickNext();
    await screen.findByTestId('rollupJobCreateDateHistogramTitle');

    // Step 2
    setInputValue('rollupJobInterval', '10m');
    clickNext();
    await screen.findByTestId('rollupJobCreateTermsTitle');

    // Step 3
    clickNext();
    await screen.findByTestId('rollupJobCreateHistogramTitle');

    // Step 4
    clickNext();
    await screen.findByTestId('rollupJobCreateMetricsTitle');
  };

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep5();
    fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
    await screen.findByTestId('rollupJobMetricsFieldChooser');
  };

  const getMetricsFieldList = () => screen.getByTestId('rollupJobMetricsFieldList');

  const getFieldListRow = (fieldName) => {
    const fieldList = getMetricsFieldList();
    const cell = within(fieldList).getByText(fieldName);
    const row = cell.closest('tr');
    expect(row).not.toBeNull();
    return row;
  };

  const getCheckboxInputIn = (container, testId) => {
    // EUI's EuiCheckbox typically applies data-test-subj to the actual <input type="checkbox" />.
    return within(container).getByTestId(testId);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
    mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields, dateFields } });
    renderJobCreate();
    await screen.findByTestId('rollupJobCreateLogisticsTitle');
  });

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep5();
    });

    it('should have the horizontal step active on "Metrics"', () => {
      expect(screen.getByTestId(/createRollupStep5--active/)).toHaveTextContent('Metrics');
    });

    it('should have the title set to "Metrics"', () => {
      expect(screen.getByTestId('rollupJobCreateMetricsTitle')).toBeInTheDocument();
    });

    it('should have a link to the documentation', () => {
      expect(screen.getByTestId('rollupJobCreateMetricsDocsButton')).toBeInTheDocument();
    });

    test('should have a deprecation callout', () => {
      expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    it('should have the "next" and "back" button visible', () => {
      expect(screen.getByTestId('rollupJobBackButton')).toBeInTheDocument();
      expect(screen.getByTestId('rollupJobNextButton')).toBeInTheDocument();
      expect(screen.queryByTestId('rollupJobSaveButton')).not.toBeInTheDocument();
    });

    it('should go to the "Histogram" step when clicking the back button', async () => {
      clickBack();
      expect(await screen.findByTestId('rollupJobCreateHistogramTitle')).toBeInTheDocument();
    });

    it('should go to the "Review" step when clicking the next button', async () => {
      clickNext();
      expect(await screen.findByTestId('rollupJobCreateReviewTitle')).toBeInTheDocument();
    });

    it('should have a button to display the list of metrics fields to chose from', async () => {
      expect(screen.queryByTestId('rollupJobMetricsFieldChooser')).not.toBeInTheDocument();

      // Use userEvent for this interaction to avoid EuiPopover-related act warnings
      const user = userEvent.setup();
      await user.click(screen.getByTestId('rollupJobShowFieldChooserButton'));

      // Wait for flyout to mount; keeps async portal updates inside test boundaries.
      expect(await screen.findByTestId('rollupJobMetricsFieldChooser')).toBeInTheDocument();
    });
  });

  describe('metrics field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add metrics fields"', async () => {
        expect(screen.getByTestId('rollupJobCreateFlyoutTitle')).toHaveTextContent(
          'Add metrics fields'
        );
      });

      it('should have a button to close the flyout', () => {
        expect(screen.getByTestId('rollupJobMetricsFieldChooser')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

        expect(screen.queryByTestId('rollupJobMetricsFieldChooser')).not.toBeInTheDocument();
      });
    });

    describe('table', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
        await screen.findByTestId('rollupJobMetricsFieldChooser-table');
      });

      it('should display the fields with metrics and its type', async () => {
        const chooserTable = screen.getByTestId('rollupJobMetricsFieldChooser-table');
        [
          'a-numericField',
          'numeric',
          'b-dateField',
          'date',
          'c-numericField',
          'd-dateField',
        ].forEach((t) => expect(chooserTable).toHaveTextContent(t));
      });

      it('should add metric field to the field list when clicking on a row', () => {
        expect(screen.getByText('No metrics fields added')).toBeInTheDocument();

        fireEvent.click(screen.getByText('a-numericField'));

        const fieldList = getMetricsFieldList();
        expect(fieldList).toHaveTextContent('a-numericField');
        expect(fieldList).toHaveTextContent('numeric');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep5();
      expect(screen.getByText('No metrics fields added')).toBeInTheDocument();
    });

    describe('when fields are added', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
        await screen.findByTestId('rollupJobMetricsFieldChooser-table');
      });

      it('should have "avg", "max", "min", "sum" & "value count" metrics for *numeric* fields', () => {
        fireEvent.click(screen.getByText('a-numericField'));

        const numericRow = getFieldListRow('a-numericField');
        numericTypeMetrics.forEach((type) => {
          expect(
            getCheckboxInputIn(numericRow, `rollupJobMetricsCheckbox-${type}`)
          ).toBeInTheDocument();
        });

        // Make sure there are no other checkboxes in the row besides select-all + allowed metrics.
        const rowCheckboxes = within(numericRow).getAllByRole('checkbox');
        expect(rowCheckboxes.length).toBe(numericTypeMetrics.length + 1);
      });

      it('should have "max", "min", & "value count" metrics for *date* fields', () => {
        fireEvent.click(screen.getByText('b-dateField'));

        const dateRow = getFieldListRow('b-dateField');
        dateTypeMetrics.forEach((type) => {
          expect(
            getCheckboxInputIn(dateRow, `rollupJobMetricsCheckbox-${type}`)
          ).toBeInTheDocument();
        });

        // Make sure there are no other checkboxes in the row besides select-all + allowed metrics.
        const rowCheckboxes = within(dateRow).getAllByRole('checkbox');
        expect(rowCheckboxes.length).toBe(dateTypeMetrics.length + 1);
      });

      it('should not allow to go to the next step if at least one metric type is not selected', () => {
        expect(screen.queryByTestId('rollupJobCreateStepError')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('a-numericField'));
        clickNext();

        expect(screen.getByTestId('rollupJobCreateStepError')).toBeInTheDocument();
        expect(document.body.textContent).toContain(
          'Select metrics types for these fields or remove them: a-numericField.'
        );
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should have a delete button on each row to remove the metric field', async () => {
        fireEvent.click(screen.getByText('a-numericField'));

        const fieldList = getMetricsFieldList();
        expect(within(fieldList).getByText('a-numericField')).toBeInTheDocument();

        const removeButtons = within(fieldList).getAllByRole('button', { name: /remove/i });
        fireEvent.click(removeButtons[0]);

        expect(screen.getByText('No metrics fields added')).toBeInTheDocument();
      });
    });

    describe('when using multi-selectors', () => {
      let user;

      beforeEach(() => {
        // Prefer userEvent for EuiPopover interactions to avoid act warnings
        user = userEvent.setup();
      });

      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
        await screen.findByTestId('rollupJobMetricsFieldChooser-table');

        // Add one numeric and one date field so row/column selectors are enabled.
        fireEvent.click(screen.getByText('a-numericField'));
        fireEvent.click(screen.getByText('b-dateField'));

        // Open the column-wise selector popover (EuiPopover portal).
        await user.click(screen.getByTestId('rollupJobSelectAllMetricsPopoverButton'));
        await screen.findByTestId('rollupJobMetricsSelectAllCheckbox-all');
      });

      const expectAllAllowedMetricsInRow = (row, expected) => {
        const inputs = within(row).getAllByRole('checkbox');
        inputs.forEach((input) => {
          if (expected) {
            expect(input).toBeChecked();
          } else {
            expect(input).not.toBeChecked();
          }
        });
      };

      it('should select all of the fields in a row', async () => {
        const numericRow = getFieldListRow('a-numericField');
        fireEvent.click(getCheckboxInputIn(numericRow, 'rollupJobMetricsCheckbox-selectAll'));
        expectAllAllowedMetricsInRow(numericRow, true);
      });

      it('should deselect all of the fields in a row ', async () => {
        const numericRow = getFieldListRow('a-numericField');
        const selectAll = getCheckboxInputIn(numericRow, 'rollupJobMetricsCheckbox-selectAll');

        fireEvent.click(selectAll);
        expectAllAllowedMetricsInRow(numericRow, true);

        fireEvent.click(selectAll);
        expectAllAllowedMetricsInRow(numericRow, false);
      });

      it('should select all of the metric types across rows (column-wise)', async () => {
        const avgSelectAll = screen.getByTestId('rollupJobMetricsSelectAllCheckbox-avg');
        await user.click(avgSelectAll);

        const numericRow = getFieldListRow('a-numericField');
        expect(getCheckboxInputIn(numericRow, 'rollupJobMetricsCheckbox-avg')).toBeChecked();
        // Ensure other metric types remain unchecked.
        ['max', 'min', 'sum', 'value_count', 'selectAll'].forEach((t) => {
          const testId =
            t === 'selectAll'
              ? 'rollupJobMetricsCheckbox-selectAll'
              : `rollupJobMetricsCheckbox-${t}`;
          expect(getCheckboxInputIn(numericRow, testId)).not.toBeChecked();
        });

        const dateRow = getFieldListRow('b-dateField');
        expect(
          within(dateRow).queryByTestId('rollupJobMetricsCheckbox-avg')
        ).not.toBeInTheDocument();
      });

      it('should deselect all of the metric types across rows (column-wise)', async () => {
        const avgSelectAll = screen.getByTestId('rollupJobMetricsSelectAllCheckbox-avg');
        const avgInput = avgSelectAll;

        await user.click(avgInput);
        await user.click(avgInput);

        const numericRow = getFieldListRow('a-numericField');
        expect(getCheckboxInputIn(numericRow, 'rollupJobMetricsCheckbox-avg')).not.toBeChecked();
      });

      it('should correctly select across rows and columns', async () => {
        const avgSelectAll = screen.getByTestId('rollupJobMetricsSelectAllCheckbox-avg');
        const maxSelectAll = screen.getByTestId('rollupJobMetricsSelectAllCheckbox-max');

        // 1. Select all avg column-wise (numeric only)
        await user.click(avgSelectAll);
        // 2. Select all max column-wise (numeric + date)
        await user.click(maxSelectAll);

        const numericRow = getFieldListRow('a-numericField');
        const numericRowSelectAll = getCheckboxInputIn(
          numericRow,
          'rollupJobMetricsCheckbox-selectAll'
        );

        // 3. Select and deselect row-wise the first numeric metric row.
        fireEvent.click(numericRowSelectAll);
        fireEvent.click(numericRowSelectAll);

        // 4. Expect the avg and max select all checkboxes to be unchecked.
        expect(avgSelectAll).not.toBeChecked();
        expect(maxSelectAll).not.toBeChecked();

        const dateRow = getFieldListRow('b-dateField');
        const dateRowSelectAll = getCheckboxInputIn(dateRow, 'rollupJobMetricsCheckbox-selectAll');

        // 5. Select all on the last date metric row-wise.
        fireEvent.click(dateRowSelectAll);

        // 6. Select then deselect all max column-wise.
        const maxInput = maxSelectAll;
        await user.click(maxInput);
        await user.click(maxInput);

        // 7. Expect everything but all and max to be selected on the last date metric row.
        expect(getCheckboxInputIn(dateRow, 'rollupJobMetricsCheckbox-selectAll')).not.toBeChecked();
        expect(getCheckboxInputIn(dateRow, 'rollupJobMetricsCheckbox-max')).not.toBeChecked();
        expect(getCheckboxInputIn(dateRow, 'rollupJobMetricsCheckbox-min')).toBeChecked();
        expect(getCheckboxInputIn(dateRow, 'rollupJobMetricsCheckbox-value_count')).toBeChecked();
      });
    });
  });
});
