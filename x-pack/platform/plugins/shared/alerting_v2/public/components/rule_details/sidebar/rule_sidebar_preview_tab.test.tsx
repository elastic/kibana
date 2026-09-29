/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleSidebarPreviewTab } from './rule_sidebar_preview_tab';

let capturedProps: Record<string, unknown> = {};

vi.mock('@kbn/alerting-v2-rule-form', () => {
  const mocked = {
    QuerySandbox: (props: Record<string, unknown>) => {
      capturedProps = props;
      return <div data-test-subj="mockQuerySandbox" />;
    },
    RuleFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-query', () => {
  const mocked = {
    QueryClient: vi.fn().mockImplementation(() => ({})),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    CoreStart: (key: string) => key,
    useService: (token: unknown) => {
      if (token === 'http') return { basePath: { prepend: (p: string) => p } };
      if (token === 'notifications') return { toasts: { addSuccess: vi.fn() } };
      if (token === 'application') return { navigateToUrl: vi.fn() };
      return {};
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/core-di', () => {
  const mocked = {
    PluginStart: (key: string) => `plugin:${key}`,
  };
  return { ...mocked, default: mocked };
});

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { base: 'FROM logs-* | STATS count() BY host.name' },
  created_by: { profile_uid: 'alice@example.com' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'bob@example.com' },
  updated_at: '2026-03-04T12:00:00.000Z',
};

const renderPreviewTab = (rule: RuleApiResponse = baseRule) =>
  render(
    <RuleProvider rule={rule}>
      <RuleSidebarPreviewTab />
    </RuleProvider>
  );

describe('RuleSidebarPreviewTab', () => {
  beforeEach(() => {
    capturedProps = {};
    vi.clearAllMocks();
  });

  it('renders QuerySandbox', () => {
    renderPreviewTab();
    expect(screen.getByTestId('mockQuerySandbox')).toBeInTheDocument();
  });

  it('passes the query from the rule context', () => {
    renderPreviewTab();
    expect(capturedProps.query).toBe('FROM logs-* | STATS count() BY host.name');
  });

  it('passes the time field from the rule context', () => {
    renderPreviewTab();
    expect(capturedProps.timeField).toBe('@timestamp');
  });

  it('defaults time field to @timestamp when rule has no time_field', () => {
    const { time_field: _, ...ruleWithoutTimeField } = baseRule;
    renderPreviewTab(ruleWithoutTimeField as RuleApiResponse);
    expect(capturedProps.timeField).toBe('@timestamp');
  });

  it('defaults query to empty string when query is missing', () => {
    const { query: _, ...ruleWithoutQuery } = baseRule;
    renderPreviewTab(ruleWithoutQuery as RuleApiResponse);
    expect(capturedProps.query).toBe('');
  });

  it('passes autoRun as true', () => {
    renderPreviewTab();
    expect(capturedProps.autoRun).toBe(true);
  });

  it('does not pass onQueryChange (read-only mode)', () => {
    renderPreviewTab();
    expect(capturedProps.onQueryChange).toBeUndefined();
  });

  it('passes dateRange with default values', () => {
    renderPreviewTab();
    expect(capturedProps.dateRange).toEqual({
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
  });
});
