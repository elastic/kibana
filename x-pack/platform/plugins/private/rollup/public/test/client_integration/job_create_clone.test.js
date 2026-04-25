/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { mockHttpRequest, wrapComponent } from './helpers';
import {
  registerRouter,
  setHttp,
  init as initDocumentation,
  deserializeJob,
} from '../../crud_app/services';
import { createRollupJobsStore } from '../../crud_app/store';
import { JobCreate } from '../../crud_app/sections';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';

const {
  jobs: [{ config: jobConfig }],
} = JOB_TO_CLONE;

describe('Cloning a rollup job through create job wizard', () => {
  let startMock;
  let history;

  const renderJobClone = () => {
    const store = createRollupJobsStore({
      cloneJob: { job: deserializeJob(JOB_TO_CLONE.jobs[0]) },
    });
    history = createMemoryHistory({ initialEntries: ['/create'] });
    registerRouter({ history });
    const WrappedJobCreate = wrapComponent(JobCreate);

    renderWithI18n(
      <Provider store={store}>
        <Router history={history}>
          <Route path="/create" component={WrappedJobCreate} />
        </Router>
      </Provider>
    );
  };

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
    mockHttpRequest(startMock.http, { indxPatternVldtResp: JOB_CLONE_INDEX_PATTERN_CHECK });
    renderJobClone();

    // Wait for async index pattern validation kicked off on mount to settle,
    // otherwise React may warn about updates not wrapped in act().
    await screen.findByTestId('fieldIndexPatternSuccessMessage');
  });

  it('should have fields correctly pre-populated', async () => {
    // Step 1: Logistics

    const jobNameInput = await screen.findByTestId('rollupJobName');
    expect(jobNameInput).toHaveValue(jobConfig.id + '-copy');
    // Advanced cron should automatically show when we are cloning a job
    expect(screen.getByTestId('rollupAdvancedCron')).toBeInTheDocument();

    expect(screen.getByTestId('rollupAdvancedCron')).toHaveValue(jobConfig.cron);
    expect(screen.getByTestId('rollupPageSize')).toHaveValue(jobConfig.page_size);
    const {
      groups: { date_histogram: dateHistogram },
    } = jobConfig;
    expect(screen.getByTestId('rollupDelay')).toHaveValue(dateHistogram.delay);

    setInputValue('rollupJobName', 't3');
    setInputValue('rollupIndexName', 't3');

    clickNext();

    // Step 2: Date histogram

    await screen.findByTestId('rollupJobCreateDateHistogramTitle');
    expect(screen.getByTestId('rollupJobCreateDateFieldSelect')).toHaveValue(dateHistogram.field);
    expect(screen.getByTestId('rollupJobInterval')).toHaveValue(dateHistogram.calendar_interval);
    expect(screen.getByTestId('rollupJobCreateTimeZoneSelect')).toHaveValue(
      dateHistogram.time_zone
    );

    clickNext();

    // Step 3: Terms

    await screen.findByTestId('rollupJobCreateTermsTitle');
    const {
      groups: {
        terms: { fields: terms },
      },
    } = jobConfig;

    const termsFieldList = screen.getByTestId('rollupJobTermsFieldList');
    terms.forEach((t) => expect(termsFieldList).toHaveTextContent(t));

    clickNext();

    // Step 4: Histogram

    await screen.findByTestId('rollupJobCreateHistogramTitle');

    const {
      groups: {
        histogram: { fields: histogramsTerms },
      },
    } = jobConfig;

    const histogramFieldList = screen.getByTestId('rollupJobHistogramFieldList');
    histogramsTerms.forEach((t) => expect(histogramFieldList).toHaveTextContent(t));

    clickNext();

    // Step 5: Metrics

    await screen.findByTestId('rollupJobCreateMetricsTitle');
    const { metrics } = jobConfig;
    const metricsFieldList = screen.getByTestId('rollupJobMetricsFieldList');

    // For each metric config from the cloned job, assert that the corresponding checkbox is checked.
    metrics.forEach(({ field, metrics: checkedTypes }) => {
      // Scope to the table row by finding the field name and walking up.
      const fieldCell = within(metricsFieldList).getByText(field);
      const row = fieldCell.closest('tr');
      expect(row).not.toBeNull();
      checkedTypes.forEach((type) => {
        const checkbox = within(row).getByTestId(`rollupJobMetricsCheckbox-${type}`);
        expect(checkbox).toBeChecked();
      });
    });
  });

  it('should correctly reset defaults after index pattern changes', async () => {
    // 1. Logistics

    // Sanity check for rollup job name, i.e., we are in clone mode.
    expect(await screen.findByTestId('rollupJobName')).toHaveValue(jobConfig.id + '-copy');

    // Changing the index pattern value after cloning a rollup job should update a number of values.
    // On each view of the set up wizard we check for the expected state after this change.

    await act(async () => {
      setInputValue('rollupIndexPattern', 'test');
    });

    const {
      groups: { date_histogram: dateHistogram },
    } = jobConfig;

    clickNext();

    // 2. Date Histogram

    expect(await screen.findByTestId('rollupJobCreateDateHistogramTitle')).toBeInTheDocument();
    expect(screen.getByTestId('rollupJobCreateDateFieldSelect')).toHaveValue(dateHistogram.field);

    clickNext();

    // 3. Terms

    expect(await screen.findByTestId('rollupJobCreateTermsTitle')).toBeInTheDocument();
    expect(screen.getByText('No terms fields added')).toBeInTheDocument();

    clickNext();

    // 4. Histogram

    expect(await screen.findByTestId('rollupJobCreateHistogramTitle')).toBeInTheDocument();
    expect(screen.getByText('No histogram fields added')).toBeInTheDocument();

    clickNext();

    // 5. Metrics

    expect(await screen.findByTestId('rollupJobCreateMetricsTitle')).toBeInTheDocument();
    expect(screen.getByText('No metrics fields added')).toBeInTheDocument();

    // 6. Review

    clickNext();

    expect(await screen.findByTestId('rollupJobCreateReviewTitle')).toBeInTheDocument();
  });
});
