/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../../common/mock';
import { CasesListOnboarding } from './cases_list_onboarding';

// The tour anchors the cases-list controls reference are not present in this isolated render, and
// EuiTourStep does not mount its popover in jsdom, so these tests cover the banner + start/dismiss
// state logic rather than the tour popover itself.
describe('CasesListOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the welcome banner with start-tour and dismiss actions', () => {
    renderWithTestingProviders(<CasesListOnboarding />);

    expect(screen.getByTestId('cases-list-welcome-banner')).toBeInTheDocument();
    expect(screen.getByTestId('cases-list-welcome-banner-start-tour')).toBeInTheDocument();
    expect(screen.getByTestId('cases-list-welcome-banner-dismiss')).toBeInTheDocument();
  });

  it('hides the banner when the tour is started', async () => {
    renderWithTestingProviders(<CasesListOnboarding />);

    await userEvent.click(screen.getByTestId('cases-list-welcome-banner-start-tour'));

    expect(screen.queryByTestId('cases-list-welcome-banner')).not.toBeInTheDocument();
  });

  it('hides the banner when dismissed', async () => {
    renderWithTestingProviders(<CasesListOnboarding />);

    await userEvent.click(screen.getByTestId('cases-list-welcome-banner-dismiss'));

    expect(screen.queryByTestId('cases-list-welcome-banner')).not.toBeInTheDocument();
  });
});
