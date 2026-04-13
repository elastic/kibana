/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AgentBuilderAnnouncementModal } from './agent_builder_announcement_modal';

const defaultProps = {
  onContinue: jest.fn(),
  onRevert: jest.fn(),
};

const renderWithEui = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en">
      <EuiProvider>{ui}</EuiProvider>
    </IntlProvider>
  );

describe('AgentBuilderAnnouncementModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes onContinue when the primary button is clicked', async () => {
    const user = userEvent.setup();
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} />);

    await user.click(screen.getByTestId('agentBuilderAnnouncementContinueButton'));

    expect(defaultProps.onContinue).toHaveBeenCalled();
  });

  it('invokes onRevert when the revert button is clicked', async () => {
    const user = userEvent.setup();
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} />);

    await user.click(screen.getByTestId('agentBuilderAnnouncementRevertButton'));

    expect(defaultProps.onRevert).toHaveBeenCalled();
  });

  it('invokes onContinue when the modal close control is used', async () => {
    const user = userEvent.setup();
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Closes this modal window' }));

    expect(defaultProps.onContinue).toHaveBeenCalled();
  });

  it('hides revert and shows read-only copy when canRevertToAssistant is false', () => {
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} canRevertToAssistant={false} />);

    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Only a user with permission to change space-level Gen AI settings/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toHaveTextContent(
      'Got it'
    );
  });
});
