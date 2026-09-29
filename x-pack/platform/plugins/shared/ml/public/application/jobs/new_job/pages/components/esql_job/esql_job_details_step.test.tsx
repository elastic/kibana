/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlJobDetailsStep } from './esql_job_details_step';
import { EsqlWizardProvider } from './esql_wizard_context';

const renderStep = () =>
  renderWithI18n(
    <EsqlWizardProvider>
      <EsqlJobDetailsStep />
    </EsqlWizardProvider>
  );

describe('EsqlJobDetailsStep', () => {
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
});
