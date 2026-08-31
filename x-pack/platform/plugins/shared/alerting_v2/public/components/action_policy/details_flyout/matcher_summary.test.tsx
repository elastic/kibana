/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { MatcherSummary } from './matcher_summary';

const renderWithI18n = (matcher: PolicyMatcher | null | undefined) =>
  render(
    <I18nProvider>
      <MatcherSummary matcher={matcher} />
    </I18nProvider>
  );

describe('MatcherSummary', () => {
  it('renders the catch-all message when the matcher is null', () => {
    renderWithI18n(null);

    expect(screen.getByText('Matches all alerts.')).toBeInTheDocument();
  });

  it('renders the catch-all message when every matcher field is empty', () => {
    renderWithI18n({ tags: [], expression: '  ' });

    expect(screen.getByText('Matches all alerts.')).toBeInTheDocument();
  });

  it('renders tag values joined by "or"', () => {
    renderWithI18n({ tags: ['prod', 'alerts'] });

    expect(screen.getByText('Rule tagged with')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('alerts')).toBeInTheDocument();
    expect(screen.getByText('or')).toBeInTheDocument();
    expect(screen.queryByText('Matches all alerts.')).toBeNull();
  });

  it('renders the KQL expression verbatim', () => {
    const expression = 'data.env:"production" and data.sev:"critical"';
    renderWithI18n({ expression });

    expect(screen.getByText('Matches query')).toBeInTheDocument();
    expect(screen.getByText(expression)).toBeInTheDocument();
  });

  it('joins multiple clauses with "and"', () => {
    renderWithI18n({
      tags: ['prod', 'alerts'],
      expression: 'data.env:"production"',
    });

    expect(screen.getByText('Matches alerts where')).toBeInTheDocument();
    expect(screen.getByText('Rule tagged with')).toBeInTheDocument();
    expect(screen.getByText('Matches query')).toBeInTheDocument();
    expect(screen.getAllByText('and').length).toBeGreaterThanOrEqual(1);
  });
});
