/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  getSelectedJobId$,
  setSelectedJobId,
} from '../../../../application/components/job_suggestion/selected_job';
import { SelectedJob } from './selected_job';

const mockJobsSummary = jest.fn();

// The same api each render, as the real context gives.
const mockMlApi = { jobs: { jobsSummary: mockJobsSummary } };

const mockGetUrl = jest.fn();
const mockGetTime = jest.fn();

// The same services each render, as the real context gives.
const mockServices = {
  share: { url: { locators: { get: () => ({ getUrl: mockGetUrl }) } } },
  data: { query: { timefilter: { timefilter: { getTime: mockGetTime } } } },
};

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlApi: () => mockMlApi,
  useMlKibana: () => ({ services: mockServices }),
}));

describe('SelectedJob', () => {
  const renderIt = () =>
    render(
      <I18nProvider>
        <SelectedJob indexPattern="selected-*" />
      </I18nProvider>
    );

  beforeEach(() => {
    window.localStorage.clear();
    setSelectedJobId('selected-*', undefined);
    mockJobsSummary.mockReset();
    mockJobsSummary.mockResolvedValue([{ id: 'mine', description: 'Watches the logs' }]);
    mockGetTime.mockReturnValue({ from: 'now-7d', to: 'now' });
    mockGetUrl.mockImplementation(async (params: { page?: string; appId?: string }) =>
      params.page === 'explorer'
        ? '/app/ml/explorer?job=mine'
        : `/app/management/ml/${params.appId}`
    );
  });

  it('shows nothing when there is no job selected', () => {
    renderIt();
    expect(screen.queryByTestId('mlDiscoverADManagementSelectedJob')).not.toBeInTheDocument();
    expect(mockJobsSummary).not.toHaveBeenCalled();
  });

  it('shows the id and description of the selected job', async () => {
    setSelectedJobId('selected-*', 'mine');
    renderIt();

    expect(screen.getByText('mine')).toBeInTheDocument();
    expect(await screen.findByText('Watches the logs')).toBeInTheDocument();
    expect(mockJobsSummary).toHaveBeenCalledWith(['mine']);
  });

  it('shows the id when the description could not be loaded', async () => {
    mockJobsSummary.mockRejectedValue(new Error('boom'));
    setSelectedJobId('selected-*', 'mine');
    renderIt();

    expect(await screen.findByText('mine')).toBeInTheDocument();
    expect(getSelectedJobId$('selected-*').getValue()).toBe('mine');
  });

  it('deselects the job when it no longer exists', async () => {
    mockJobsSummary.mockResolvedValue([]);
    setSelectedJobId('selected-*', 'mine');
    renderIt();

    await waitFor(() => expect(getSelectedJobId$('selected-*').getValue()).toBeUndefined());
    expect(screen.queryByTestId('mlDiscoverADManagementSelectedJob')).not.toBeInTheDocument();
  });

  it('follows the selection', async () => {
    renderIt();
    act(() => setSelectedJobId('selected-*', 'mine'));
    expect(await screen.findByText('mine')).toBeInTheDocument();

    act(() => setSelectedJobId('selected-*', undefined));
    expect(screen.queryByTestId('mlDiscoverADManagementSelectedJob')).not.toBeInTheDocument();
  });

  it('deselects the job with its button', async () => {
    setSelectedJobId('selected-*', 'mine');
    renderIt();

    fireEvent.click(await screen.findByTestId('mlDiscoverADManagementSelectedJobDeselect'));

    expect(getSelectedJobId$('selected-*').getValue()).toBeUndefined();
    expect(screen.queryByTestId('mlDiscoverADManagementSelectedJob')).not.toBeInTheDocument();
  });

  describe('viewing the job in Anomaly Explorer', () => {
    it('links to the page for the job and the time range of the chart, in a new tab', async () => {
      setSelectedJobId('selected-*', 'mine');
      renderIt();

      const button = await screen.findByTestId('mlDiscoverADManagementSelectedJobExplorer');

      expect(button).toHaveAttribute('href', '/app/ml/explorer?job=mine');
      expect(button).toHaveAttribute('target', '_blank');
      expect(mockGetUrl).toHaveBeenCalledWith({
        page: 'explorer',
        pageState: { jobIds: ['mine'], timeRange: { from: 'now-7d', to: 'now' } },
      });
    });

    it('is not shown without a job', () => {
      renderIt();
      expect(
        screen.queryByTestId('mlDiscoverADManagementSelectedJobExplorer')
      ).not.toBeInTheDocument();
    });

    it('is not shown when the page url could not be made', async () => {
      mockGetUrl.mockRejectedValue(new Error('boom'));
      setSelectedJobId('selected-*', 'mine');
      renderIt();

      expect(await screen.findByText('mine')).toBeInTheDocument();
      expect(
        screen.queryByTestId('mlDiscoverADManagementSelectedJobExplorer')
      ).not.toBeInTheDocument();
    });
  });

  describe('managing the job', () => {
    it('links to the jobs list filtered to the job, in a new tab', async () => {
      setSelectedJobId('selected-*', 'mine');
      renderIt();

      const button = await screen.findByTestId('mlDiscoverADManagementSelectedJobManage');

      expect(button).toHaveTextContent('Manage job');
      expect(button).toHaveAttribute(
        'href',
        "/app/management/ml/anomaly_detection?_a=(jobs:(queryText:'id:mine'))"
      );
      expect(button).toHaveAttribute('target', '_blank');
    });

    it('is not shown without a job', () => {
      renderIt();
      expect(
        screen.queryByTestId('mlDiscoverADManagementSelectedJobManage')
      ).not.toBeInTheDocument();
    });

    it('is not shown when the page url could not be made', async () => {
      mockGetUrl.mockRejectedValue(new Error('boom'));
      setSelectedJobId('selected-*', 'mine');
      renderIt();

      expect(await screen.findByText('mine')).toBeInTheDocument();
      expect(
        screen.queryByTestId('mlDiscoverADManagementSelectedJobManage')
      ).not.toBeInTheDocument();
    });
  });
});
