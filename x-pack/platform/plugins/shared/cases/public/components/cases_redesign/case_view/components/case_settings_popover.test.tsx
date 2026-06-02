/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseSettingsPopover } from './case_settings_popover';
import { renderWithTestingProviders } from '../../../../common/mock';
import { basicCase } from '../../../../containers/mock';
import { useGetTemplates } from '../../../templates_v2/hooks/use_get_templates';
import { useChangeAppliedTemplate } from '../../../case_view/use_change_applied_template';
import { useGetTemplate } from '../../../templates_v2/hooks/use_get_template';

jest.mock('../../../templates_v2/hooks/use_get_templates');
jest.mock('../../../case_view/use_change_applied_template');
jest.mock('../../../templates_v2/hooks/use_get_template');
jest.mock('../../../../common/lib/kibana');

(useGetTemplates as jest.Mock).mockReturnValue({
  data: { templates: [] },
  isLoading: false,
});
(useChangeAppliedTemplate as jest.Mock).mockReturnValue({
  mutate: jest.fn(),
});
(useGetTemplate as jest.Mock).mockReturnValue({ data: null });

describe('CaseSettingsPopover', () => {
  const anchorElement = document.createElement('button');
  document.body.appendChild(anchorElement);

  const defaultProps = {
    caseData: basicCase,
    syncAlerts: true,
    onSyncAlertsChange: jest.fn(),
    showMetrics: true,
    onShowMetricsChange: jest.fn(),
    onCaseNameChange: jest.fn(),
    isOpen: true,
    onClose: jest.fn(),
    anchorElement,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetTemplates as jest.Mock).mockReturnValue({
      data: { templates: [] },
      isLoading: false,
    });
    (useChangeAppliedTemplate as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    });
    (useGetTemplate as jest.Mock).mockReturnValue({ data: null });
  });

  it('renders the popover with title', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-popover')).toBeInTheDocument();
  });

  it('renders sync alerts switch', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-sync-alerts-switch')).toBeInTheDocument();
  });

  it('renders show metrics switch', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-show-metrics-switch')).toBeInTheDocument();
  });

  it('calls onSyncAlertsChange when switch is toggled', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} syncAlerts={false} />);

    await userEvent.click(await screen.findByTestId('case-settings-sync-alerts-switch'));

    await waitFor(() => {
      expect(defaultProps.onSyncAlertsChange).toHaveBeenCalledWith(true);
    });
  });

  it('calls onShowMetricsChange when switch is toggled', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} showMetrics={false} />);

    await userEvent.click(await screen.findByTestId('case-settings-show-metrics-switch'));

    await waitFor(() => {
      expect(defaultProps.onShowMetricsChange).toHaveBeenCalledWith(true);
    });
  });

  it('renders edit case name link', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-change-name')).toBeInTheDocument();
  });

  it('opens rename modal when edit case name is clicked', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-settings-change-name'));

    expect(await screen.findByTestId('case-rename-modal')).toBeInTheDocument();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('submits new name and closes modal', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-settings-change-name'));

    const input = await screen.findByTestId('case-rename-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'New case name');

    await userEvent.click(await screen.findByTestId('case-rename-submit'));

    await waitFor(() => {
      expect(defaultProps.onCaseNameChange).toHaveBeenCalledWith('New case name');
    });
  });

  it('disables submit when name is same as current', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-settings-change-name'));

    const submitButton = await screen.findByTestId('case-rename-submit');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit when name is empty', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-settings-change-name'));

    const input = await screen.findByTestId('case-rename-input');
    await userEvent.clear(input);

    const submitButton = await screen.findByTestId('case-rename-submit');
    expect(submitButton).toBeDisabled();
  });

  it('does not render popover content when isOpen is false', () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('case-settings-sync-alerts-switch')).not.toBeInTheDocument();
  });

  it('renders template selector', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-template-select')).toBeInTheDocument();
  });
});
