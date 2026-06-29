/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleOverviewSection } from './rule_overview_section';
import { RuleProvider } from '../rule_context';
import type { RuleApiResponse } from '../../../services/rules_api';

jest.mock('./alert_timeline/alert_timeline_section', () => ({
  AlertTimelineSection: () => <div data-test-subj="alertTimelineSectionMock">timeline</div>,
}));

jest.mock('./artifacts', () => ({
  DashboardArtifactsSection: () => (
    <div data-test-subj="dashboardArtifactsSectionMock">dashboards</div>
  ),
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed' as const, base: 'FROM logs-*', breach: { segment: '' } },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const renderSection = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <RuleOverviewSection />
      </RuleProvider>
    </I18nProvider>
  );

describe('RuleOverviewSection', () => {
  it('renders the alert activity timeline for alert rules', () => {
    renderSection({ ...baseRule, kind: 'alert' });
    expect(screen.getByTestId('alertTimelineSectionMock')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardArtifactsSectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('signalRuleOverviewEmptyState')).not.toBeInTheDocument();
  });

  it('renders the empty state instead of the timeline for signal rules', () => {
    renderSection({ ...baseRule, kind: 'signal' });
    expect(screen.getByTestId('signalRuleOverviewEmptyState')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardArtifactsSectionMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertTimelineSectionMock')).not.toBeInTheDocument();
  });
});
