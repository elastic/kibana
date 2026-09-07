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

describe('Create Rollup Job, step 3: Terms', () => {
  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));
  const clickBack = () => fireEvent.click(screen.getByTestId('rollupJobBackButton'));

  const goToStep3 = async () => {
    // Step 1: Logistics (required)
    setInputValue('rollupJobName', 'test-job');
    setInputValue('rollupIndexPattern', 'kibana*');
    setInputValue('rollupIndexName', 'rollup-index');
    await screen.findByTestId('fieldIndexPatternSuccessMessage');
    clickNext();
    await screen.findByTestId('rollupJobCreateDateHistogramTitle');

    // Step 2: Date histogram (required)
    setInputValue('rollupJobInterval', '10m');
    clickNext();
    await screen.findByTestId('rollupJobCreateTermsTitle');
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

  const numericFields = ['a-numericField', 'c-numericField'];
  const keywordFields = ['b-keywordField', 'd-keywordField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep3();
    fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
    await screen.findByTestId('rollupJobTermsFieldChooser');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep3();
    });

    it('should have the horizontal step active on "Terms"', () => {
      expect(screen.getByTestId(/createRollupStep3--active/)).toHaveTextContent('Terms');
    });

    it('should have the title set to "Terms"', () => {
      expect(screen.getByTestId('rollupJobCreateTermsTitle')).toBeInTheDocument();
    });

    it('should have a link to the documentation', () => {
      expect(screen.getByTestId('rollupJobCreateTermsDocsButton')).toBeInTheDocument();
    });

    test('should have a deprecation callout', () => {
      expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    it('should have the "next" and "back" button visible', () => {
      expect(screen.getByTestId('rollupJobBackButton')).toBeInTheDocument();
      expect(screen.getByTestId('rollupJobNextButton')).toBeInTheDocument();
      expect(screen.queryByTestId('rollupJobSaveButton')).not.toBeInTheDocument();
    });

    it('should go to the "Date histogram" step when clicking the back button', async () => {
      clickBack();
      expect(await screen.findByTestId('rollupJobCreateDateHistogramTitle')).toBeInTheDocument();
    });

    it('should go to the "Histogram" step when clicking the next button', async () => {
      clickNext();
      expect(await screen.findByTestId('rollupJobCreateHistogramTitle')).toBeInTheDocument();
    });

    it('should have a button to display the list of terms to chose from', () => {
      expect(screen.queryByTestId('rollupJobTermsFieldChooser')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));

      expect(screen.getByTestId('rollupJobTermsFieldChooser')).toBeInTheDocument();
    });
  });

  describe('terms field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add terms fields"', async () => {
        expect(screen.getByTestId('rollupJobCreateFlyoutTitle')).toHaveTextContent(
          'Add terms fields'
        );
      });

      it('should have a button to close the flyout', () => {
        expect(screen.getByTestId('rollupJobTermsFieldChooser')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

        expect(screen.queryByTestId('rollupJobTermsFieldChooser')).not.toBeInTheDocument();
      });
    });

    describe('when no terms are available', () => {
      it('should indicate it to the user', async () => {
        mockHttpRequest(startMock.http, {
          indxPatternVldtResp: {
            numericFields: [],
            keywordFields: [],
          },
        });
        await goToStepAndOpenFieldChooser();
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });

    describe('when terms are available', () => {
      beforeEach(async () => {
        mockHttpRequest(startMock.http, {
          indxPatternVldtResp: {
            numericFields,
            keywordFields,
          },
        });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the numeric & keyword fields available', async () => {
        const chooserTable = screen.getByTestId('rollupJobTermsFieldChooser-table');
        [
          'a-numericField',
          'numeric',
          'b-keywordField',
          'keyword',
          'c-numericField',
          'd-keywordField',
        ].forEach((t) => expect(chooserTable).toHaveTextContent(t));
      });

      it('should add term to the field list when clicking on it', () => {
        expect(screen.getByText('No terms fields added')).toBeInTheDocument();

        fireEvent.click(screen.getByText('a-numericField'));

        const fieldList = screen.getByTestId('rollupJobTermsFieldList');
        expect(fieldList).toHaveTextContent('a-numericField');
        expect(fieldList).toHaveTextContent('numeric');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep3();
      expect(screen.getByText('No terms fields added')).toBeInTheDocument();
    });

    it('should have a delete button on each row to remove a term', async () => {
      // First let's add a term to the list
      mockHttpRequest(startMock.http, {
        indxPatternVldtResp: {
          numericFields,
          keywordFields,
        },
      });
      await goToStepAndOpenFieldChooser();

      fireEvent.click(screen.getByText('a-numericField'));
      const fieldList = screen.getByTestId('rollupJobTermsFieldList');
      expect(fieldList).toHaveTextContent('a-numericField');

      // EuiInMemoryTable actions render "Remove" buttons; click the first one.
      const removeButtons = within(fieldList).getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      expect(screen.getByText('No terms fields added')).toBeInTheDocument();
    });
  });
});
