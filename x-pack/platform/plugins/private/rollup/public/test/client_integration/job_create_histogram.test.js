/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';

import { mockHttpRequest, renderJobCreate } from './helpers';
import { setHttp, init as initDocumentation } from '../../crud_app/services';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';

describe('Create Rollup Job, step 4: Histogram', () => {
  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));
  const clickBack = () => fireEvent.click(screen.getByTestId('rollupJobBackButton'));

  const goToStep4 = async () => {
    // Step 1: Logistics
    setInputValue('rollupJobName', 'test-job');
    setInputValue('rollupIndexPattern', 'kibana*');
    setInputValue('rollupIndexName', 'rollup-index');
    await screen.findByTestId('fieldIndexPatternSuccessMessage');
    clickNext();
    await screen.findByTestId('rollupJobCreateDateHistogramTitle');

    // Step 2: Date histogram
    setInputValue('rollupJobInterval', '10m');
    clickNext();
    await screen.findByTestId('rollupJobCreateTermsTitle');

    // Step 3: Terms (optional)
    clickNext();
    await screen.findByTestId('rollupJobCreateHistogramTitle');
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
    mockHttpRequest(startMock.http);
    renderJobCreate();
    await screen.findByTestId('rollupJobCreateLogisticsTitle');
  });

  const numericFields = ['a-numericField', 'b-numericField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep4();
    fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
    await screen.findByTestId('rollupJobHistogramFieldChooser');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep4();
    });

    it('should have the horizontal step active on "Histogram"', () => {
      expect(screen.getByTestId(/createRollupStep4--active/)).toHaveTextContent('Histogram');
    });

    it('should have the title set to "Terms"', () => {
      expect(screen.getByTestId('rollupJobCreateHistogramTitle')).toBeInTheDocument();
    });

    it('should have a link to the documentation', () => {
      expect(screen.getByTestId('rollupJobCreateHistogramDocsButton')).toBeInTheDocument();
    });

    test('should have a deprecation callout', () => {
      expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    it('should have the "next" and "back" button visible', () => {
      expect(screen.getByTestId('rollupJobBackButton')).toBeInTheDocument();
      expect(screen.getByTestId('rollupJobNextButton')).toBeInTheDocument();
      expect(screen.queryByTestId('rollupJobSaveButton')).not.toBeInTheDocument();
    });

    it('should go to the "Terms" step when clicking the back button', async () => {
      clickBack();
      expect(await screen.findByTestId('rollupJobCreateTermsTitle')).toBeInTheDocument();
    });

    it('should go to the "Metrics" step when clicking the next button', async () => {
      clickNext();
      expect(await screen.findByTestId('rollupJobCreateMetricsTitle')).toBeInTheDocument();
    });

    it('should have a button to display the list of histogram fields to chose from', () => {
      expect(screen.queryByTestId('rollupJobHistogramFieldChooser')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));

      expect(screen.getByTestId('rollupJobHistogramFieldChooser')).toBeInTheDocument();
    });
  });

  describe('histogram field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add histogram fields"', async () => {
        expect(screen.getByTestId('rollupJobCreateFlyoutTitle')).toHaveTextContent(
          'Add histogram fields'
        );
      });

      it('should have a button to close the flyout', () => {
        expect(screen.getByTestId('rollupJobHistogramFieldChooser')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

        expect(screen.queryByTestId('rollupJobHistogramFieldChooser')).not.toBeInTheDocument();
      });
    });

    describe('when no histogram fields are availalbe', () => {
      it('should indicate it to the user', async () => {
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields: [] } });
        await goToStepAndOpenFieldChooser();
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });

    describe('when histogram fields are available', () => {
      beforeEach(async () => {
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields } });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the histogram fields available', async () => {
        const chooserTable = screen.getByTestId('rollupJobHistogramFieldChooser-table');
        expect(chooserTable).toHaveTextContent('a-numericField');
        expect(chooserTable).toHaveTextContent('b-numericField');
      });

      it('should add histogram field to the field list when clicking on it', () => {
        expect(screen.getByText('No histogram fields added')).toBeInTheDocument();
        fireEvent.click(screen.getByText('a-numericField'));

        const fieldList = screen.getByTestId('rollupJobHistogramFieldList');
        expect(fieldList).toHaveTextContent('a-numericField');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep4();
      expect(screen.getByText('No histogram fields added')).toBeInTheDocument();
    });

    it('should have a delete button on each row to remove an histogram field', async () => {
      // First let's add a term to the list
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields } });
      await goToStepAndOpenFieldChooser();
      fireEvent.click(screen.getByText('a-numericField'));

      const fieldList = screen.getByTestId('rollupJobHistogramFieldList');
      const removeButtons = within(fieldList).getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      expect(screen.getByText('No histogram fields added')).toBeInTheDocument();
    });
  });

  describe('interval', () => {
    beforeEach(async () => {
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields } });
      await goToStep4();
      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
      await screen.findByTestId('rollupJobHistogramFieldChooser-table');
      fireEvent.click(screen.getByText('a-numericField'));
      expect(await screen.findByTestId('rollupJobCreateHistogramInterval')).toBeInTheDocument();
    });

    describe('input validation', () => {
      afterEach(() => {
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should display errors when clicking "next" without filling the interval', () => {
        expect(screen.queryByTestId('rollupJobCreateStepError')).not.toBeInTheDocument();
        clickNext();
        expect(screen.getByTestId('rollupJobCreateStepError')).toBeInTheDocument();
        expect(document.body.textContent).toContain('Interval must be a whole number.');
      });

      it('should be a whole number', () => {
        setInputValue('rollupJobCreateHistogramInterval', '5.5');
        clickNext();
        expect(document.body.textContent).toContain('Interval must be a whole number.');
      });

      it('should be greater than zero', () => {
        setInputValue('rollupJobCreateHistogramInterval', '-1');
        clickNext();
        expect(document.body.textContent).toContain('Interval must be greater than zero.');
      });
    });

    it('should go to next "Metrics" step if value is valid', () => {
      setInputValue('rollupJobCreateHistogramInterval', '3');
      clickNext();
      expect(screen.getByTestId(/createRollupStep5--active/)).toHaveTextContent('Metrics');
    });
  });
});
