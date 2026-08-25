/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { first } from 'lodash';

import { mockHttpRequest, renderJobCreate } from './helpers';
import { setHttp } from '../../crud_app/services';
import { JOBS } from './helpers/constants';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('../../kibana_services', () => {
  const services = jest.requireActual('../../kibana_services');
  return {
    ...services,
    getUiStatsReporter: jest.fn(() => () => {}),
  };
});

describe('Create Rollup Job, step 6: Review', () => {
  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));
  const clickBack = () => fireEvent.click(screen.getByTestId('rollupJobBackButton'));
  const clickSave = () => fireEvent.click(screen.getByTestId('rollupJobSaveButton'));

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    mockHttpRequest(startMock.http);
    renderJobCreate();
    await screen.findByTestId('rollupJobCreateLogisticsTitle');
  });

  const goToStep6 = async () => {
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

    // Step 4: Histogram (optional)
    clickNext();
    await screen.findByTestId('rollupJobCreateMetricsTitle');

    // Step 5: Metrics (optional unless fields selected)
    clickNext();
    await screen.findByTestId('rollupJobCreateReviewTitle');
  };

  const getTabsText = () =>
    screen
      .getAllByTestId('stepReviewTab')
      .map((t) => t.textContent?.trim())
      .filter(Boolean);

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep6();
    });

    it('should have the horizontal step active on "Review"', () => {
      expect(screen.getByTestId(/createRollupStep6--active/)).toHaveTextContent('Review');
    });

    it('should have the title set to "Review"', () => {
      expect(screen.getByTestId('rollupJobCreateReviewTitle')).toBeInTheDocument();
    });

    test('should have a deprecation callout', () => {
      expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    it('should have the "next" and "save" button visible', () => {
      expect(screen.getByTestId('rollupJobBackButton')).toBeInTheDocument();
      expect(screen.queryByTestId('rollupJobNextButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('rollupJobSaveButton')).toBeInTheDocument();
    });

    it('should go to the "Metrics" step when clicking the back button', async () => {
      clickBack();
      expect(await screen.findByTestId('rollupJobCreateMetricsTitle')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should have a "Summary" & "Request" tabs to review the Job', async () => {
      await goToStep6();
      expect(getTabsText()).toEqual(['Summary', 'Request']);
    });

    it('should have a "Summary", "Terms" & "Request" tab if a term aggregation was added', async () => {
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields: ['my-field'] } });
      // Navigate to step 3
      setInputValue('rollupJobName', 'test-job');
      setInputValue('rollupIndexPattern', 'kibana*');
      setInputValue('rollupIndexName', 'rollup-index');
      await screen.findByTestId('fieldIndexPatternSuccessMessage');
      clickNext();
      await screen.findByTestId('rollupJobCreateDateHistogramTitle');
      setInputValue('rollupJobInterval', '10m');
      clickNext();
      await screen.findByTestId('rollupJobCreateTermsTitle');

      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
      await screen.findByTestId('rollupJobTermsFieldChooser-table');
      fireEvent.click(screen.getByText('my-field'));

      clickNext(); // step 4
      await screen.findByTestId('rollupJobCreateHistogramTitle');
      clickNext(); // step 5
      await screen.findByTestId('rollupJobCreateMetricsTitle');
      clickNext(); // review
      await screen.findByTestId('rollupJobCreateReviewTitle');

      expect(getTabsText()).toEqual(['Summary', 'Terms', 'Request']);
    });

    it('should have a "Summary", "Histogram" & "Request" tab if a histogram field was added', async () => {
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields: ['a-field'] } });
      // Navigate to step 4
      await goToStep6();
      // We are already on review; go back twice to reach histogram and configure.
      clickBack();
      await screen.findByTestId('rollupJobCreateMetricsTitle');
      clickBack();
      await screen.findByTestId('rollupJobCreateHistogramTitle');

      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
      await screen.findByTestId('rollupJobHistogramFieldChooser-table');
      fireEvent.click(screen.getByText('a-field'));
      setInputValue('rollupJobCreateHistogramInterval', '3');

      clickNext(); // metrics
      await screen.findByTestId('rollupJobCreateMetricsTitle');
      clickNext(); // review
      await screen.findByTestId('rollupJobCreateReviewTitle');

      expect(getTabsText()).toEqual(['Summary', 'Histogram', 'Request']);
    });

    it('should have a "Summary", "Metrics" & "Request" tab if a histogram field was added', async () => {
      mockHttpRequest(startMock.http, {
        indxPatternVldtResp: {
          numericFields: ['a-field'],
          dateFields: ['b-field'],
        },
      });
      // Navigate to metrics
      setInputValue('rollupJobName', 'test-job');
      setInputValue('rollupIndexPattern', 'kibana*');
      setInputValue('rollupIndexName', 'rollup-index');
      await screen.findByTestId('fieldIndexPatternSuccessMessage');
      clickNext();
      await screen.findByTestId('rollupJobCreateDateHistogramTitle');
      setInputValue('rollupJobInterval', '10m');
      clickNext();
      await screen.findByTestId('rollupJobCreateTermsTitle');
      clickNext();
      await screen.findByTestId('rollupJobCreateHistogramTitle');
      clickNext();
      await screen.findByTestId('rollupJobCreateMetricsTitle');

      fireEvent.click(screen.getByTestId('rollupJobShowFieldChooserButton'));
      await screen.findByTestId('rollupJobMetricsFieldChooser-table');
      fireEvent.click(screen.getByText('a-field'));

      const fieldList = screen.getByTestId('rollupJobMetricsFieldList');
      const avgCheckbox = within(fieldList).getByTestId('rollupJobMetricsCheckbox-avg');
      fireEvent.click(avgCheckbox);

      clickNext(); // review
      await screen.findByTestId('rollupJobCreateReviewTitle');
      expect(getTabsText()).toEqual(['Summary', 'Metrics', 'Request']);
    });
  });

  describe('save()', () => {
    const jobCreateApiPath = '/api/rollup/create';
    const jobStartApiPath = '/api/rollup/start';

    describe('without starting job after creation', () => {
      it('should call the "create" Api server endpoint', async () => {
        mockHttpRequest(startMock.http, {
          createdJob: first(JOBS.jobs),
        });

        await goToStep6();

        expect(startMock.http.put).not.toHaveBeenCalledWith(jobCreateApiPath); // make sure it hasn't been called
        expect(startMock.http.get).not.toHaveBeenCalledWith(jobStartApiPath); // make sure it hasn't been called

        clickSave();

        // There is a 500 timeout before receiving the response.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(500);
        });

        expect(startMock.http.put).toHaveBeenCalledWith(jobCreateApiPath, expect.anything()); // It has been called!
        expect(startMock.http.get).not.toHaveBeenCalledWith(jobStartApiPath); // It has still not been called!
      });
    });

    describe('with starting job after creation', () => {
      it('should call the "create" and "start" Api server endpoints', async () => {
        mockHttpRequest(startMock.http, {
          createdJob: first(JOBS.jobs),
        });

        await goToStep6();

        const startNowCheckbox = screen.getByRole('checkbox', { name: 'Start job now' });
        expect(startNowCheckbox).not.toBeChecked();
        await act(async () => {
          fireEvent.click(startNowCheckbox);
          await Promise.resolve();
        });
        expect(startNowCheckbox).toBeChecked();

        expect(startMock.http.post).not.toHaveBeenCalledWith(jobStartApiPath); // make sure it hasn't been called

        await act(async () => {
          clickSave();
        });

        // Flush the 500ms save delay + the noticeable delay.
        await act(async () => {
          await jest.runAllTimersAsync();
        });

        expect(startMock.http.post).toHaveBeenCalledWith(jobStartApiPath, {
          body: JSON.stringify({
            jobIds: ['test-job'],
          }),
        });
      });
    });
  });
});
