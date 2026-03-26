/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Pager } from '@elastic/eui';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { getJobs, jobCount } from '../../../../../fixtures';
import { createRollupJobsStore } from '../../../store';
import { JobTable } from './job_table';

jest.mock('../../../../kibana_services', () => {
  const services = jest.requireActual('../../../../kibana_services');
  return {
    ...services,
    trackUiMetric: jest.fn(),
  };
});

jest.mock('../../../services', () => {
  const services = jest.requireActual('../../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

const defaultProps = {
  jobs: [],
  pager: new Pager(20, 10, 1),
  filter: '',
  sortField: '',
  isSortAscending: false,
  openDetailPanel: () => {},
  closeDetailPanel: () => {},
  filterChanged: () => {},
  pageChanged: () => {},
  pageSizeChanged: () => {},
  sortChanged: () => {},
};

const renderComponent = (overrides = {}) => {
  const store = createRollupJobsStore();
  renderWithI18n(
    <Provider store={store}>
      <JobTable {...defaultProps} {...overrides} />
    </Provider>
  );
  return store;
};

describe('<JobTable />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('table rows', () => {
    const totalJobs = jobCount;
    const jobs = getJobs(totalJobs);
    const openDetailPanel = jest.fn();

    beforeEach(() => {
      renderComponent({ jobs, openDetailPanel });
    });

    it('should create 1 table row per job', () => {
      expect(screen.getAllByTestId('jobTableRow')).toHaveLength(totalJobs);
    });

    it('should create the expected 8 columns for each row', () => {
      const expectedColumns = [
        'id',
        'status',
        'indexPattern',
        'rollupIndex',
        'rollupDelay',
        'dateHistogramInterval',
        'groups',
        'metrics',
      ];

      expectedColumns.forEach((columnId) => {
        expect(screen.getByTestId(`jobTableHeaderCell-${columnId}`)).toBeInTheDocument();
      });
    });

    it('should set the correct job value in each row cell', () => {
      const unformattedFields = [
        'id',
        'indexPattern',
        'rollupIndex',
        'rollupDelay',
        'dateHistogramInterval',
      ];
      const row = screen.getAllByTestId('jobTableRow')[0];
      const job = jobs[0];

      unformattedFields.forEach((field) => {
        expect(within(row).getByTestId(`jobTableCell-${field}`)).toHaveTextContent(job[field]);
      });

      // Status
      expect(job.status).toEqual('stopped'); // make sure the job status *is* "stopped"
      expect(within(row).getByTestId('jobTableCell-status')).toHaveTextContent('Stopped');

      // Groups
      expect(within(row).getByTestId('jobTableCell-groups')).toHaveTextContent('Histogram, terms');

      // Metrics
      const expectedJobMetrics = job.metrics.reduce(
        (text, { name }) => (text ? `${text}, ${name}` : name),
        ''
      );
      expect(within(row).getByTestId('jobTableCell-metrics')).toHaveTextContent(expectedJobMetrics);
    });

    it('should open the detail panel when clicking on the job id', () => {
      const row = screen.getAllByTestId('jobTableRow')[0];
      const job = jobs[0];
      const idCell = within(row).getByTestId('jobTableCell-id');

      fireEvent.click(within(idCell).getByText(job.id));

      expect(openDetailPanel).toHaveBeenCalledTimes(1);
      expect(openDetailPanel).toHaveBeenCalledWith(encodeURIComponent(job.id));
    });

    it('should still render despite unknown job statuses', () => {
      const row = screen.getAllByTestId('jobTableRow')[totalJobs - 1];
      // In job fixtures, the last job has unknown status
      expect(within(row).getByTestId('jobTableCell-status')).toHaveTextContent('Unknown');
    });
  });

  describe('action menu', () => {
    let jobs;

    beforeEach(() => {
      jobs = getJobs();
    });

    it('should be visible when a job is selected', () => {
      renderComponent({ jobs });
      const selectJob = (index = 0) => {
        const job = jobs[index];
        const candidates = screen.getAllByTestId(`indexTableRowCheckbox-${job.id}`);
        const input = candidates.find((el) => el.tagName === 'INPUT');
        expect(input).toBeDefined();
        fireEvent.click(input);
      };

      expect(screen.queryByTestId('jobActionMenuButton')).not.toBeInTheDocument();

      selectJob();

      expect(screen.getByTestId('jobActionMenuButton')).toBeInTheDocument();
    });

    it('should have a "start" and "delete" action for a job that is stopped', async () => {
      const index = 0;
      const job = jobs[index];
      job.status = 'stopped';

      renderComponent({ jobs });
      const candidates = screen.getAllByTestId(`indexTableRowCheckbox-${job.id}`);
      const input = candidates.find((el) => el.tagName === 'INPUT');
      expect(input).toBeDefined();
      fireEvent.click(input);
      fireEvent.click(screen.getByTestId('jobActionMenuButton')); // open the context menu

      const contextMenu = await screen.findByTestId('jobActionContextMenu');
      expect(within(contextMenu).getByText('Start job')).toBeInTheDocument();
      expect(within(contextMenu).getByText('Delete job')).toBeInTheDocument();
    });

    it('should only have a "stop" action when the job is started', async () => {
      const index = 0;
      const job = jobs[index];
      job.status = 'started';

      renderComponent({ jobs });
      const candidates = screen.getAllByTestId(`indexTableRowCheckbox-${job.id}`);
      const input = candidates.find((el) => el.tagName === 'INPUT');
      expect(input).toBeDefined();
      fireEvent.click(input);
      fireEvent.click(screen.getByTestId('jobActionMenuButton'));

      const contextMenu = await screen.findByTestId('jobActionContextMenu');
      expect(within(contextMenu).getByText('Stop job')).toBeInTheDocument();
      expect(within(contextMenu).queryByText('Start job')).not.toBeInTheDocument();
    });

    it('should offer both "start" and "stop" actions when selecting job with different a status', async () => {
      const job1 = jobs[0];
      const job2 = jobs[1];
      job1.status = 'started';
      job2.status = 'stopped';

      renderComponent({ jobs });
      const selectJob = (jobToSelect) => {
        const candidates = screen.getAllByTestId(`indexTableRowCheckbox-${jobToSelect.id}`);
        const input = candidates.find((el) => el.tagName === 'INPUT');
        expect(input).toBeDefined();
        fireEvent.click(input);
      };
      selectJob(job1);
      selectJob(job2);
      fireEvent.click(screen.getByTestId('jobActionMenuButton'));

      const contextMenu = await screen.findByTestId('jobActionContextMenu');
      expect(within(contextMenu).getByText('Start jobs')).toBeInTheDocument();
      expect(within(contextMenu).getByText('Stop jobs')).toBeInTheDocument();
    });
  });
});
