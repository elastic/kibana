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

jest.mock('./signal_rule_overview', () => ({
  SignalRuleOverview: () => <div data-test-subj="signalRuleOverviewMock">signal</div>,
}));

jest.mock('./artifacts', () => ({
  ArtifactsSection: () => <div data-test-subj="artifactsSectionMock">artifacts</div>,
}));

const mockCanRead = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ canRead: mockCanRead }),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRead.mockReturnValue(true);
  });

  describe('activity section routing', () => {
    it('renders the alert timeline for alert rules', () => {
      renderSection({ ...baseRule, kind: 'alert' });
      expect(screen.getByTestId('alertTimelineSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('signalRuleOverviewMock')).not.toBeInTheDocument();
    });

    it('renders the signal overview instead of the timeline for signal rules', () => {
      renderSection({ ...baseRule, kind: 'signal' });
      expect(screen.getByTestId('signalRuleOverviewMock')).toBeInTheDocument();
      expect(screen.queryByTestId('alertTimelineSectionMock')).not.toBeInTheDocument();
    });

    it('hides the alert timeline when the user cannot read alerts', () => {
      mockCanRead.mockReturnValue(false);
      renderSection({ ...baseRule, kind: 'alert' });
      expect(screen.queryByTestId('alertTimelineSectionMock')).not.toBeInTheDocument();
    });
  });

  describe('artifacts visibility', () => {
    it('shows the artifacts section for alert rules', () => {
      renderSection({ ...baseRule, kind: 'alert' });
      expect(screen.getByTestId('artifactsSectionMock')).toBeInTheDocument();
    });

    it('does not show artifacts for signal rules', () => {
      renderSection({ ...baseRule, kind: 'signal' });
      expect(screen.queryByTestId('artifactsSectionMock')).not.toBeInTheDocument();
    });
  });
});
