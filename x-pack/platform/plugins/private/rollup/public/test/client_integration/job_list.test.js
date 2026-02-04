/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { mockHttpRequest, wrapComponent } from './helpers';

import {
  getRouter,
  registerRouter,
  setHttp,
  init as initDocumentation,
} from '../../crud_app/services';
import { createRollupJobsStore } from '../../crud_app/store';
import { JobList } from '../../crud_app/sections';
import { JOBS } from './helpers/constants';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';

jest.mock('../../crud_app/services', () => {
  const services = jest.requireActual('../../crud_app/services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

jest.mock('../../kibana_services', () => {
  const services = jest.requireActual('../../kibana_services');
  return {
    ...services,
    getUiStatsReporter: jest.fn(() => () => {}),
  };
});

describe('<JobList />', () => {
  describe('detail panel', () => {
    let startMock;
    let history;

    const renderJobList = () => {
      const store = createRollupJobsStore();
      history = createMemoryHistory({ initialEntries: ['/'] });
      const WrappedJobList = wrapComponent(JobList);

      // Used by getRouterLinkProps() consumers.
      registerRouter({ history });

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
      initDocumentation(docLinksServiceMock.createStartContract());

      mockHttpRequest(startMock.http, { jobs: JOBS });
      renderJobList();

      // Wait for the initial loadJobs() side effects to settle (UI boundary).
      await screen.findByTestId('rollupDeprecationCallout');
    });

    test('should have a deprecation callout', async () => {
      expect(await screen.findByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    test('should open the detail panel when clicking on a job in the table', async () => {
      const jobId = JOBS.jobs[0].config.id;

      expect(screen.queryByTestId('rollupJobDetailFlyout')).not.toBeInTheDocument();

      fireEvent.click(await screen.findByText(jobId));

      expect(await screen.findByTestId('rollupJobDetailFlyout')).toBeInTheDocument();
    });

    test('should add the Job id to the route query params when opening the detail panel', async () => {
      const jobId = JOBS.jobs[0].config.id;

      expect(getRouter().history.location.search).toEqual('');

      fireEvent.click(await screen.findByText(jobId));

      await waitFor(() => {
        expect(getRouter().history.location.search).toEqual(`?job=${jobId}`);
      });
    });

    test('should open the detail panel whenever a job id is added to the query params', async () => {
      expect(screen.queryByTestId('rollupJobDetailFlyout')).not.toBeInTheDocument();

      act(() => {
        getRouter().history.replace({ search: `?job=bar` });
      });

      expect(await screen.findByTestId('rollupJobDetailFlyout')).toBeInTheDocument();
    });
  });
});
