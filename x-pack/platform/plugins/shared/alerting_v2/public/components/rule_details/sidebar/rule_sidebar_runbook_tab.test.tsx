/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleSidebarRunbookTab } from './rule_sidebar_runbook_tab';

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Rule' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  evaluation: { query: { base: 'FROM logs-* | STATS count() BY host.name' } },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const renderRunbookTab = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <RuleSidebarRunbookTab />
      </RuleProvider>
    </I18nProvider>
  );

describe('RuleSidebarRunbookTab', () => {
  it('renders empty prompt when rule has no artifacts', () => {
    renderRunbookTab(baseRule);
    expect(screen.getByTestId('sidebarRunbookEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebarRunbookContent')).not.toBeInTheDocument();
  });

  it('renders empty prompt when artifacts exist but none are runbooks', () => {
    renderRunbookTab({
      ...baseRule,
      artifacts: [{ id: 'other-1', type: 'other', value: 'not a runbook' }],
    });
    expect(screen.getByTestId('sidebarRunbookEmpty')).toBeInTheDocument();
  });

  it('renders markdown content when a runbook artifact exists', () => {
    renderRunbookTab({
      ...baseRule,
      artifacts: [
        { id: 'runbook-1', type: 'runbook', value: '# Alert Response\n\n- Step one\n- Step two' },
      ],
    });
    expect(screen.getByTestId('sidebarRunbookContent')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebarRunbookEmpty')).not.toBeInTheDocument();
    expect(screen.getByText('Alert Response')).toBeInTheDocument();
  });

  it('picks the first runbook when multiple artifacts exist', () => {
    renderRunbookTab({
      ...baseRule,
      artifacts: [
        { id: 'other-1', type: 'dashboard', value: 'some-dashboard-id' },
        { id: 'runbook-1', type: 'runbook', value: '# First Runbook' },
        { id: 'runbook-2', type: 'runbook', value: '# Second Runbook' },
      ],
    });
    expect(screen.getByText('First Runbook')).toBeInTheDocument();
  });
});
