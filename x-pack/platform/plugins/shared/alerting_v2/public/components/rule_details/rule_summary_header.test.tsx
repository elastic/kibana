/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleHeaderDescription, RuleTagsList } from './rule_summary_header';
import { RuleProvider } from './rule_context';
import type { RuleApiResponse } from '../../services/rules_api';

const baseRule = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'My Rule', tags: ['prod', 'infra'] },
} as RuleApiResponse;

const wrap = (ui: React.ReactElement, rule: RuleApiResponse = baseRule) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>{ui}</RuleProvider>
    </I18nProvider>
  );

describe('RuleHeaderDescription', () => {
  it('renders description text', () => {
    const rule = {
      ...baseRule,
      metadata: { name: 'My Rule', description: 'Alert when errors exceed threshold.' },
    } as RuleApiResponse;
    wrap(<RuleHeaderDescription />, rule);
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent(
      'Alert when errors exceed threshold.'
    );
  });

  it('returns null when there is no description', () => {
    const rule = { ...baseRule, metadata: { name: 'No Description' } } as RuleApiResponse;
    const { container } = wrap(<RuleHeaderDescription />, rule);
    expect(container.innerHTML).toBe('');
  });
});

describe('RuleTagsList', () => {
  it('renders tags as badges', () => {
    wrap(<RuleTagsList />);
    expect(screen.getByTestId('ruleTags')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('infra')).toBeInTheDocument();
  });

  it('returns null when tags are empty', () => {
    const { container } = wrap(<RuleTagsList />, {
      ...baseRule,
      metadata: { name: 'No Tags', tags: [] },
    } as RuleApiResponse);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when tags are undefined', () => {
    const rule = { ...baseRule, metadata: { name: 'No Tags' } } as RuleApiResponse;
    const { container } = wrap(<RuleTagsList />, rule);
    expect(container.innerHTML).toBe('');
  });
});
