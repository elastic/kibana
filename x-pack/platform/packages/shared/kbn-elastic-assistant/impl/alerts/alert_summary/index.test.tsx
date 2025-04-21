/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AlertSummary } from '.';
import type { PromptContext } from '../../..';
import { useAlertSummary } from './use_alert_summary';

jest.mock('./use_alert_summary');
const promptContext: PromptContext = {
  category: 'alert',
  description: 'Alert summary',
  getPromptContext: jest
    .fn()
    .mockResolvedValue('{ host.name: "test-host", more.data: 123, "user.name": "test-user"}'),
  id: '_promptContextId',
  suggestedUserPrompt: '_suggestedUserPrompt',
  tooltip: '_tooltip',
  replacements: { 'host.name': '12345' },
};
const defaultProps = {
  alertId: 'test-alert-id',
  canSeeAdvancedSettings: true,
  defaultConnectorId: 'test-connector-id',
  isContextReady: true,
  promptContext,
  setHasAlertSummary: jest.fn(),
  showAnonymizedValues: false,
};

describe('AlertSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: false,
      fetchAISummary: jest.fn(),
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
  });

  it('renders the loading state when `isLoading` is true', () => {
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: true,
      fetchAISummary: jest.fn(),
      isLoading: true,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
    render(<AlertSummary {...defaultProps} />);
    expect(screen.getByTestId('generating-summary')).toBeInTheDocument();
  });

  it('renders the alert summary when `hasAlertSummary` is true and `isLoading` is false', () => {
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: 'Test alert summary',
      recommendedActions: 'Test recommended actions',
      hasAlertSummary: true,
      fetchAISummary: jest.fn(),
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
    render(<AlertSummary {...defaultProps} />);
    expect(screen.getAllByTestId('messageText')[0]).toHaveTextContent('Test alert summary');
    expect(screen.getAllByTestId('messageText')[1]).toHaveTextContent('Test recommended actions');
  });

  it('renders the generate button when `hasAlertSummary` is false', () => {
    const fetchAISummary = jest.fn();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: false,
      fetchAISummary,
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
    render(<AlertSummary {...defaultProps} />);
    fireEvent.click(screen.getByTestId('generateInsights'));
    expect(fetchAISummary).toHaveBeenCalled();
  });

  it('renders the regenerate button when `hasAlertSummary` is true', () => {
    const fetchAISummary = jest.fn();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: 'Test alert summary',
      recommendedActions: 'Test recommended actions',
      hasAlertSummary: true,
      fetchAISummary,
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
    render(<AlertSummary {...defaultProps} />);
    fireEvent.click(screen.getByTestId('regenerateInsights'));
    expect(fetchAISummary).toHaveBeenCalled();
  });
});
