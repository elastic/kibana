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
import { RuleSummaryAboutCard } from './rule_summary_about_card';

const renderCard = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleSummaryAboutCard rule={rule} />
    </I18nProvider>
  );

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: {
    name: 'My Rule',
    description: 'A rule description',
    tags: ['prod', 'latency'],
    signature_id: 'test-sig-id',
    version: 1,
    revision: 0,
    source: { type: 'internal' as const, version: 1 },
    ownership: { managed: false },
  },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: {
    format: 'standalone',
    breach: { query: 'FROM logs-* | LIMIT 1' },
  },
  created_by: { profile_uid: 'alice@example.com' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'bob@example.com' },
  updated_at: '2026-03-04T12:00:00.000Z',
};

describe('RuleSummaryAboutCard', () => {
  it('renders description and tags in a bordered card', () => {
    renderCard(baseRule);

    expect(screen.getByTestId('ruleSummaryAboutCard')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent('A rule description');
    expect(screen.getByText('Rule tags')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTags')).toHaveTextContent('prod');
    expect(screen.getByTestId('ruleTags')).toHaveTextContent('latency');
  });

  it('shows placeholders when description and tags are missing', () => {
    renderCard({
      ...baseRule,
      metadata: {
        name: 'My Rule',
        signature_id: 'test-sig-id',
        version: 1,
        revision: 0,
        source: { type: 'internal' as const, version: 1 },
        ownership: { managed: false },
      },
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Rule tags')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent('-');
    expect(screen.queryByTestId('ruleTags')).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });
});
