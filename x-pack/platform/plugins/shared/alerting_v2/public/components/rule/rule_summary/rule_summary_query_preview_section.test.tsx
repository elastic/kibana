/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleSummaryData } from '../types';
import { RuleSummaryBody } from './rule_summary_body';
import { RuleSummaryQueryPreviewSection } from './rule_summary_query_preview_section';

let capturedProps: Record<string, unknown> = {};

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  QuerySandbox: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-test-subj="mockQuerySandbox" />;
  },
  RuleFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    if (token === 'http') return { basePath: { prepend: (path: string) => path } };
    if (token === 'notifications') return { toasts: { addSuccess: jest.fn() } };
    if (token === 'application') return { navigateToUrl: jest.fn() };
    return {};
  },
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));

const rule: RuleSummaryData = {
  kind: 'alert',
  metadata: { name: 'Test rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: {
    format: 'composed',
    base: 'FROM logs-* | STATS count() BY host.name',
    breach: { segment: '' },
  },
};

const renderQueryPreview = (summaryRule: RuleSummaryData = rule) =>
  render(
    <RuleSummaryBody rule={summaryRule}>
      <RuleSummaryQueryPreviewSection />
    </RuleSummaryBody>
  );

describe('RuleSummaryQueryPreviewSection', () => {
  beforeEach(() => {
    capturedProps = {};
    jest.clearAllMocks();
  });

  it('renders the existing QuerySandbox with the summary query', () => {
    renderQueryPreview();

    expect(screen.getByTestId('mockQuerySandbox')).toBeInTheDocument();
    expect(capturedProps.query).toBe('FROM logs-* | STATS count() BY host.name');
    expect(capturedProps.timeField).toBe('@timestamp');
    expect(capturedProps.autoRun).toBe(true);
    expect(capturedProps.onQueryChange).toBeUndefined();
  });

  it('uses the default QuerySandbox date range', () => {
    renderQueryPreview();

    expect(capturedProps.dateRange).toEqual({
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
  });
});
