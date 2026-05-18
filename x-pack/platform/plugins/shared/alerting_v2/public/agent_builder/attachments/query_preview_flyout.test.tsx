/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryPreviewFlyout } from './query_preview_flyout';

const mockServices: Record<string, unknown> = {
  'core:http': {},
  'core:notifications': { toasts: { addSuccess: jest.fn() } },
  'core:application': {},
  'plugin:data': { search: { search: jest.fn() } },
  'plugin:dataViews': {},
  'plugin:lens': { EmbeddableComponent: () => null, stateHelperApi: jest.fn() },
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `core:${key}`,
  useService: (key: string) => mockServices[key] ?? {},
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  DiscoverSandboxPanel: ({ query, readOnly }: { query: string; readOnly?: boolean }) => (
    <div data-test-subj="mockSandboxPanel" data-query={query} data-readonly={String(readOnly)} />
  ),
  RuleFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('QueryPreviewFlyout', () => {
  const defaultProps = {
    query: 'FROM logs-* | STATS count() BY host.name',
    timeField: '@timestamp',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout with "Query preview" title', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    expect(screen.getByText('Query preview')).toBeDefined();
  });

  it('renders a Close button in the footer', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    expect(screen.getByTestId('queryPreviewClose')).toBeDefined();
  });

  it('does not render an "Apply changes" button', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    expect(screen.queryByText('Apply changes')).toBeNull();
  });

  it('renders the sandbox panel in readOnly mode', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    const panel = screen.getByTestId('mockSandboxPanel');
    expect(panel.dataset.readonly).toBe('true');
  });

  it('renders the query in the sandbox panel', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    const panel = screen.getByTestId('mockSandboxPanel');
    expect(panel.dataset.query).toContain('FROM logs-*');
  });

  it('calls onClose when the Close button is clicked', () => {
    render(<QueryPreviewFlyout {...defaultProps} />);
    fireEvent.click(screen.getByTestId('queryPreviewClose'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
