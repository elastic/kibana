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
import * as i18n from './translations';
import { AGENT_BUILDER_LEARN_MORE_URL } from './announcement_urls';

const defaultProps = {
  variant: '1b' as const,
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

  it('variant 1a shows feature list and no important notes or revert', () => {
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} variant="1a" />);

    expect(screen.getByText(i18n.FEATURE_TAKES_ACTION_TITLE)).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderAnnouncementImportantNotes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementModal-1a')).toBeInTheDocument();
  });

  it('variant 1b shows features, important notes with settings copy, and revert', () => {
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} variant="1b" />);

    expect(screen.getByText(i18n.FEATURE_TAKES_ACTION_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementImportantNotes')).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_REPLACES_LEGACY_AGENTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_HISTORY_UNTOUCHED)).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_REVERT_IN_SETTINGS)).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementLearnMoreLink')).toHaveAttribute(
      'href',
      AGENT_BUILDER_LEARN_MORE_URL
    );
    expect(screen.getByTestId('agentBuilderAnnouncementRevertButton')).toBeInTheDocument();
  });

  it('variant 2a shows important notes with admin copy, no features, no revert', () => {
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} variant="2a" />);

    expect(screen.queryByText(i18n.FEATURE_TAKES_ACTION_TITLE)).not.toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementImportantNotes')).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_REPLACES_LEGACY_AGENTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_HISTORY_UNTOUCHED)).toBeInTheDocument();
    expect(screen.getByText(i18n.NOTE_CONTACT_ADMIN)).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementLearnMoreLink')).toHaveAttribute(
      'href',
      AGENT_BUILDER_LEARN_MORE_URL
    );
    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
  });

  it('release notes link points at documentation URL', () => {
    renderWithEui(<AgentBuilderAnnouncementModal {...defaultProps} variant="1a" />);

    const releaseNotes = screen.getByTestId('agentBuilderAnnouncementReleaseNotesButton');
    expect(releaseNotes).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder'
    );
  });
});
