/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlJobDetailsStep } from './esql_job_details_step';
import { EsqlWizardProvider } from './esql_wizard_context';

const mockGetAllJobAndGroupIds = jest.fn();

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: () => ({
    jobs: { getAllJobAndGroupIds: mockGetAllJobAndGroupIds },
  }),
}));

const renderStep = () =>
  renderWithI18n(
    <EsqlWizardProvider>
      <EsqlJobDetailsStep />
    </EsqlWizardProvider>
  );

describe('EsqlJobDetailsStep', () => {
  beforeEach(() => {
    mockGetAllJobAndGroupIds.mockReset();
    mockGetAllJobAndGroupIds.mockResolvedValue({ jobIds: [], groupIds: [] });
  });

  it('shows an invalid job ID error and a derived datafeed ID', () => {
    renderStep();

    fireEvent.change(screen.getByTestId('mlEsqlJobId'), { target: { value: '_invalid' } });
    expect(screen.getByTestId('mlEsqlJobId')).toBeInvalid();

    fireEvent.change(screen.getByTestId('mlEsqlJobId'), { target: { value: 'esql-job-1' } });
    expect(screen.getByTestId('mlEsqlJobId')).toBeValid();
    expect(screen.getByTestId('mlEsqlDatafeedId')).toHaveTextContent('datafeed-esql-job-1');
  });

  it('sets a job description', () => {
    renderStep();

    fireEvent.change(screen.getByTestId('mlEsqlJobDescription'), {
      target: { value: 'my esql job' },
    });
    expect(screen.getByTestId('mlEsqlJobDescription')).toHaveValue('my esql job');
  });

  it('adds a group via the combo box create option and flags an invalid group name', async () => {
    renderStep();

    const groupsInput = screen.getByTestId('mlEsqlJobGroups').querySelector('input')!;
    fireEvent.change(groupsInput, { target: { value: 'team-a' } });
    fireEvent.keyDown(groupsInput, { key: 'Enter', code: 'Enter' });

    expect(within(screen.getByTestId('mlEsqlJobGroups')).getByText('team-a')).toBeInTheDocument();

    fireEvent.change(groupsInput, { target: { value: '_bad-group' } });
    fireEvent.keyDown(groupsInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText(/Invalid group name\(s\): _bad-group/)).toBeInTheDocument();
  });

  it('fetches and suggests existing groups from the ML API', async () => {
    mockGetAllJobAndGroupIds.mockResolvedValue({
      jobIds: ['some-job'],
      groupIds: ['existing-group-a', 'existing-group-b'],
    });

    renderStep();

    await waitFor(() => expect(mockGetAllJobAndGroupIds).toHaveBeenCalledTimes(1));

    const groupsInput = screen.getByTestId('mlEsqlJobGroups').querySelector('input')!;
    await act(async () => {
      fireEvent.click(groupsInput);
    });

    expect(await screen.findByText('existing-group-a')).toBeInTheDocument();
    expect(screen.getByText('existing-group-b')).toBeInTheDocument();
  });

  it('selects an existing suggested group instead of creating a duplicate', async () => {
    mockGetAllJobAndGroupIds.mockResolvedValue({
      jobIds: [],
      groupIds: ['existing-group-a'],
    });

    renderStep();

    await waitFor(() => expect(mockGetAllJobAndGroupIds).toHaveBeenCalledTimes(1));

    const groupsInput = screen.getByTestId('mlEsqlJobGroups').querySelector('input')!;
    await act(async () => {
      fireEvent.click(groupsInput);
    });

    const option = await screen.findByText('existing-group-a');
    fireEvent.click(option);

    expect(
      within(screen.getByTestId('mlEsqlJobGroups')).getByText('existing-group-a')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Invalid group name/)).not.toBeInTheDocument();
  });

  // A native <form> turns any submit-typed button rendered by EUI (e.g. the
  // date picker's calendar toggle) into a full-page reload.
  it('does not render a native <form> element', () => {
    const { container } = renderStep();

    expect(container.querySelector('form')).toBeNull();
  });
});
