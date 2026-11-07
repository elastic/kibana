/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { filterJobsByIndex } from '../../../../application/components/job_suggestion/filter_jobs_by_index';
import {
  getSelectedJobId$,
  getShowAnomalies$,
  setSelectedJobId,
  setShowAnomalies,
} from '../../../../application/components/job_suggestion/selected_job';
import { CurrentJobs } from './current_jobs';

const mockJobsSummary = jest.fn();

// The same api each render, as the real context gives.
const mockMlApi = { jobs: { jobsSummary: mockJobsSummary } };

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlApi: () => mockMlApi,
}));

const job = (id: string, datafeedIndices: string[], description = ''): MlSummaryJob =>
  ({ id, description, datafeedIndices } as MlSummaryJob);

describe('filterJobsByIndex', () => {
  const jobs = [
    job('exact', ['logs-*']),
    job('one-of', ['metrics-*', 'logs-*']),
    job('joined', ['logs-a', 'logs-b']),
    job('other', ['metrics-*']),
    job('none', []),
  ];

  it('matches an index of the datafeed', () => {
    expect(filterJobsByIndex(jobs, 'logs-*').map(({ id }) => id)).toEqual(['exact', 'one-of']);
  });

  it('matches the indices of the datafeed joined together', () => {
    expect(filterJobsByIndex(jobs, 'logs-a,logs-b').map(({ id }) => id)).toEqual(['joined']);
  });
});

describe('CurrentJobs', () => {
  const renderIt = () =>
    render(
      <I18nProvider>
        <CurrentJobs indexPattern="logs-*" />
      </I18nProvider>
    );

  it('lists the id and description of the matching jobs', async () => {
    mockJobsSummary.mockResolvedValue([
      job('mine', ['logs-*'], 'Watches the logs'),
      job('theirs', ['metrics-*'], 'Not shown'),
    ]);
    renderIt();

    expect(await screen.findByText('mine')).toBeInTheDocument();
    expect(screen.getByText('Watches the logs')).toBeInTheDocument();
    expect(screen.queryByText('theirs')).not.toBeInTheDocument();
  });

  it('says when there are no jobs', async () => {
    mockJobsSummary.mockResolvedValue([job('theirs', ['metrics-*'])]);
    renderIt();

    expect(await screen.findByTestId('mlDiscoverADManagementCurrentJobsEmpty')).toBeInTheDocument();
  });

  it('says when the jobs could not be loaded', async () => {
    mockJobsSummary.mockRejectedValue(new Error('boom'));
    renderIt();

    expect(await screen.findByText('The jobs could not be loaded')).toBeInTheDocument();
  });

  describe('selecting a job', () => {
    const getRadio = (testSubj: string) => within(screen.getByTestId(testSubj)).getByRole('radio');

    beforeEach(() => {
      window.localStorage.clear();
      setSelectedJobId('logs-*', undefined);
      setShowAnomalies('logs-*', true);
      mockJobsSummary.mockResolvedValue([job('a', ['logs-*']), job('b', ['logs-*'])]);
    });

    it('has no job selected by default', async () => {
      renderIt();
      await screen.findByTestId('mlDiscoverADManagementCurrentJobRadioNone');
      expect(getRadio('mlDiscoverADManagementCurrentJobRadioNone')).toBeChecked();
      expect(getRadio('mlDiscoverADManagementCurrentJobRadio-a')).not.toBeChecked();
    });

    it('shows the job which is selected', async () => {
      setSelectedJobId('logs-*', 'b');
      renderIt();
      await screen.findByTestId('mlDiscoverADManagementCurrentJobRadio-b');
      expect(getRadio('mlDiscoverADManagementCurrentJobRadio-b')).toBeChecked();
      expect(getRadio('mlDiscoverADManagementCurrentJobRadioNone')).not.toBeChecked();
    });

    it('selects a job, then another, then no job', async () => {
      renderIt();

      await screen.findByTestId('mlDiscoverADManagementCurrentJobRadio-a');
      fireEvent.click(getRadio('mlDiscoverADManagementCurrentJobRadio-a'));
      expect(getSelectedJobId$('logs-*').getValue()).toBe('a');
      expect(getRadio('mlDiscoverADManagementCurrentJobRadio-a')).toBeChecked();

      fireEvent.click(getRadio('mlDiscoverADManagementCurrentJobRadio-b'));
      expect(getSelectedJobId$('logs-*').getValue()).toBe('b');

      fireEvent.click(getRadio('mlDiscoverADManagementCurrentJobRadioNone'));
      expect(getSelectedJobId$('logs-*').getValue()).toBeUndefined();
      expect(getRadio('mlDiscoverADManagementCurrentJobRadioNone')).toBeChecked();
    });

    it('shows the anomalies of the job which is selected', async () => {
      setShowAnomalies('logs-*', false);
      renderIt();

      await screen.findByTestId('mlDiscoverADManagementCurrentJobRadio-a');
      fireEvent.click(getRadio('mlDiscoverADManagementCurrentJobRadio-a'));

      expect(getShowAnomalies$('logs-*').getValue()).toBe(true);
    });

    it('does not offer no job when there are no jobs', async () => {
      mockJobsSummary.mockResolvedValue([]);
      renderIt();
      await screen.findByTestId('mlDiscoverADManagementCurrentJobsEmpty');
      expect(
        screen.queryByTestId('mlDiscoverADManagementCurrentJobRadioNone')
      ).not.toBeInTheDocument();
    });
  });
});
