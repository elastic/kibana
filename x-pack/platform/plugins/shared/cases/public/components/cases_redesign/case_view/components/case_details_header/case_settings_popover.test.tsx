/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseMetricsFeature } from '../../../../../../common/types/api';
import { CaseSettingsPopover } from './case_settings_popover';
import { renderWithTestingProviders } from '../../../../../common/mock';

describe('CaseSettingsPopover', () => {
  const anchorElement = document.createElement('button');
  document.body.appendChild(anchorElement);

  const defaultProps = {
    syncAlerts: true,
    onSyncAlertsChange: jest.fn(),
    showMetrics: true,
    onShowMetricsChange: jest.fn(),
    isOpen: true,
    onClose: jest.fn(),
    anchorElement,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the popover with title', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-popover')).toBeInTheDocument();
  });

  it('renders sync alerts switch', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    expect(await screen.findByTestId('case-settings-sync-alerts-switch')).toBeInTheDocument();
  });

  it('renders show metrics switch when metrics features are configured', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />, {
      wrapperProps: { features: { metrics: [CaseMetricsFeature.ALERTS_COUNT] } },
    });

    expect(await screen.findByTestId('case-settings-show-metrics-switch')).toBeInTheDocument();
  });

  it('does not render show metrics switch when no metrics features are configured', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />, {
      wrapperProps: { features: { metrics: [] } },
    });

    await screen.findByTestId('case-settings-popover');
    expect(screen.queryByTestId('case-settings-show-metrics-switch')).not.toBeInTheDocument();
  });

  it('calls onSyncAlertsChange when switch is toggled', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} syncAlerts={false} />);

    await userEvent.click(await screen.findByTestId('case-settings-sync-alerts-switch'));

    await waitFor(() => {
      expect(defaultProps.onSyncAlertsChange).toHaveBeenCalledWith(true);
    });
  });

  it('calls onShowMetricsChange when switch is toggled', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} showMetrics={false} />, {
      wrapperProps: { features: { metrics: [CaseMetricsFeature.ALERTS_COUNT] } },
    });

    await userEvent.click(await screen.findByTestId('case-settings-show-metrics-switch'));

    await waitFor(() => {
      expect(defaultProps.onShowMetricsChange).toHaveBeenCalledWith(true);
    });
  });

  it('does not render popover content when isOpen is false', () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('case-settings-sync-alerts-switch')).not.toBeInTheDocument();
  });

  it('does not render sync alerts switch when alerts sync is disabled', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />, {
      wrapperProps: { features: { alerts: { sync: false } } },
    });

    await screen.findByTestId('case-settings-popover');
    expect(screen.queryByTestId('case-settings-sync-alerts-switch')).not.toBeInTheDocument();
  });

  it('does not render a template selector', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await screen.findByTestId('case-settings-popover');
    expect(screen.queryByTestId('case-settings-template-select')).not.toBeInTheDocument();
  });

  it('does not render edit case name link', async () => {
    renderWithTestingProviders(<CaseSettingsPopover {...defaultProps} />);

    await screen.findByTestId('case-settings-popover');
    expect(screen.queryByTestId('case-settings-change-name')).not.toBeInTheDocument();
  });
});
