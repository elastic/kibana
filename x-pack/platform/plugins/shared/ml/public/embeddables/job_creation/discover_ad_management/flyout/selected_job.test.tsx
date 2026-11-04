/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  getSelectedJobId$,
  setSelectedJobId,
} from '../../../../application/components/job_suggestion/selected_job';
import { SelectedJob } from './selected_job';

const mockJobsSummary = jest.fn();

// The same api each render, as the real context gives.
const mockMlApi = { jobs: { jobsSummary: mockJobsSummary } };

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlApi: () => mockMlApi,
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
});
