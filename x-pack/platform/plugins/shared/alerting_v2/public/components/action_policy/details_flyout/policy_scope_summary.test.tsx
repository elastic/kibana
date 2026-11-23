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
import { PolicyScopeSummary, getPolicyScopeKind } from './policy_scope_summary';

const renderSummary = (matcher?: PolicyMatcher | null) =>
  render(
    <I18nProvider>
      <PolicyScopeSummary matcher={matcher} />
    </I18nProvider>
  );

describe('getPolicyScopeKind', () => {
  it.each([
    ['an undefined matcher', undefined],
    ['a null matcher', null],
    ['an empty matcher', {}],
    ['empty tags and a blank expression', { tags: [], expression: '  ' }],
  ])('classifies %s as catchAll', (_, matcher) => {
    expect(getPolicyScopeKind(matcher)).toBe('catchAll');
  });

  it('classifies an expression without tags as expressionOnly', () => {
    expect(getPolicyScopeKind({ tags: [], expression: 'data.severity : "critical"' })).toBe(
      'expressionOnly'
    );
  });

  it.each([
    ['tags', { tags: ['prod'] }],
    ['tags and a blank expression', { tags: ['prod'], expression: '  ' }],
  ])('classifies %s as tagsOnly', (_, matcher) => {
    expect(getPolicyScopeKind(matcher)).toBe('tagsOnly');
  });

  it('classifies tags and an expression as tagsAndExpression', () => {
    expect(getPolicyScopeKind({ tags: ['prod'], expression: 'data.severity : "critical"' })).toBe(
      'tagsAndExpression'
    );
  });
});

describe('PolicyScopeSummary', () => {
  it('renders the tags and the expression', () => {
    renderSummary({ tags: ['prod', 'cpu'], expression: 'data.severity : "critical"' });

    expect(
      screen.getByText(
        'This policy matches all alerts from rules with one of the following routing tags AND the matching query.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('cpu')).toBeInTheDocument();
    expect(screen.getByText('data.severity : "critical"')).toBeInTheDocument();
  });

  it('renders the tags without an advanced query', () => {
    renderSummary({ tags: ['prod'] });

    expect(
      screen.getByText(
        'This policy matches all alerts from rules with one of the following routing tags.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.queryByText(/Advanced matching query/)).not.toBeInTheDocument();
  });

  it('renders the expression without rule tags', () => {
    renderSummary({ expression: 'data.severity : "critical"' });

    expect(
      screen.getByText('This policy matches all alerts matching this query.')
    ).toBeInTheDocument();
    expect(screen.getByText('data.severity : "critical"')).toBeInTheDocument();
    expect(screen.queryByText('Routing tags:')).not.toBeInTheDocument();
  });

  it('renders the catch-all summary when the matcher is null', () => {
    renderSummary(null);

    expect(screen.getByText('This policy matches all alerts.')).toBeInTheDocument();
    expect(screen.queryByText('Routing tags:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced matching query/)).not.toBeInTheDocument();
  });
});
