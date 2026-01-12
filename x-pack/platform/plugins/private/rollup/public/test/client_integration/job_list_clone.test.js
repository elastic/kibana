/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { mockHttpRequest, wrapComponent } from './helpers';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';
import { registerRouter, setHttp } from '../../crud_app/services';
import { createRollupJobsStore } from '../../crud_app/store';
import { JobList } from '../../crud_app/sections';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('../../kibana_services', () => {
  const services = jest.requireActual('../../kibana_services');
  return {
    ...services,
    getUiStatsReporter: jest.fn(() => () => {}),
  };
});

describe('Smoke test cloning an existing rollup job from job list', () => {
  let startMock;
  let history;

  const renderJobList = () => {
    const store = createRollupJobsStore();
    history = createMemoryHistory({ initialEntries: ['/'] });

    registerRouter({ history });

    const WrappedJobList = wrapComponent(JobList);

    renderWithI18n(
      <Provider store={store}>
        <Router history={history}>
          <Route path="/" component={WrappedJobList} />
        </Router>
      </Provider>
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);

    mockHttpRequest(startMock.http, {
      jobs: JOB_TO_CLONE,
      indxPatternVldtResp: JOB_CLONE_INDEX_PATTERN_CHECK,
    });
    renderJobList();

    // Initial load settles.
    await screen.findByTestId('rollupDeprecationCallout');
  });

  it('should navigate to create view with default values set', async () => {
    const jobId = JOB_TO_CLONE.jobs[0].config.id;

    expect(screen.queryByTestId('rollupJobDetailFlyout')).not.toBeInTheDocument();

    const rows = await screen.findAllByTestId('jobTableRow');
    const firstRow = rows[0];
    const idCell = within(firstRow).getByTestId('jobTableCell-id');
    fireEvent.click(within(idCell).getByText(jobId));

    expect(await screen.findByTestId('rollupJobDetailFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('jobActionMenuButton'));

    expect(history.location.pathname).not.toBe(`/create`);

    // Context menu renders inside a popover; wait for a stable UI boundary before clicking.
    const contextMenu = await screen.findByTestId('jobActionContextMenu');
    fireEvent.click(within(contextMenu).getByText('Clone job'));

    expect(contextMenu).toBeInTheDocument();
    expect(history.location.pathname).toBe(`/create`);
  });
});
