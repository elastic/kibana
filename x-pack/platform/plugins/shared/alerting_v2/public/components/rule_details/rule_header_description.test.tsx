/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleHeaderDescription, RuleTitleWithBadges } from './rule_header_description';
import type { RuleApiResponse } from '../../services/rules_api';
import { useRule } from '../../hooks/use_rule';

jest.mock('../../hooks/use_rule');
const mockUseRule = useRule as jest.MockedFunction<typeof useRule>;

const baseRule = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'My Rule', tags: ['prod', 'infra'] },
} as RuleApiResponse;

const wrap = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RuleHeaderDescription', () => {
  it('renders tags as badges', () => {
    mockUseRule.mockReturnValue(baseRule);
    wrap(<RuleHeaderDescription />);
    expect(screen.getByTestId('ruleTags')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('infra')).toBeInTheDocument();
  });

  it('renders description text', () => {
    const rule = {
      ...baseRule,
      metadata: { name: 'My Rule', description: 'Alert when errors exceed threshold.' },
    } as RuleApiResponse;
    mockUseRule.mockReturnValue(rule);
    wrap(<RuleHeaderDescription />);
    expect(screen.getByTestId('ruleDescription')).toHaveTextContent(
      'Alert when errors exceed threshold.'
    );
  });

  it('renders both description and tags when both are present', () => {
    const rule = {
      ...baseRule,
      metadata: {
        name: 'My Rule',
        description: 'Some description',
        tags: ['prod', 'infra'],
      },
    } as RuleApiResponse;
    mockUseRule.mockReturnValue(rule);
    wrap(<RuleHeaderDescription />);
    expect(screen.getByTestId('ruleDescription')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTags')).toBeInTheDocument();
  });

  it('returns null when tags are empty and no description', () => {
    mockUseRule.mockReturnValue({ ...baseRule, metadata: { name: 'No Tags' } });
    const { container } = wrap(<RuleHeaderDescription />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when tags are undefined and no description', () => {
    const rule = { ...baseRule, metadata: { name: 'No Tags' } } as RuleApiResponse;
    mockUseRule.mockReturnValue(rule);
    const { container } = wrap(<RuleHeaderDescription />);
    expect(container.innerHTML).toBe('');
  });
});

describe('RuleTitleWithBadges', () => {
  it('renders the rule name', () => {
    mockUseRule.mockReturnValue(baseRule);
    wrap(<RuleTitleWithBadges />);
    expect(screen.getByTestId('ruleName')).toHaveTextContent('My Rule');
  });

  it('renders kind as Detect only for signal rules', () => {
    mockUseRule.mockReturnValue(baseRule);
    wrap(<RuleTitleWithBadges />);
    expect(screen.getByTestId('kindBadge')).toHaveTextContent('Detect only');
  });

  it('renders kind as Alerting for alert rules', () => {
    mockUseRule.mockReturnValue({ ...baseRule, kind: 'alert' });
    wrap(<RuleTitleWithBadges />);
    expect(screen.getByTestId('kindBadge')).toHaveTextContent('Alerting');
  });

  it('renders enabled badge when rule is enabled', () => {
    mockUseRule.mockReturnValue(baseRule);
    wrap(<RuleTitleWithBadges />);
    expect(screen.getByTestId('enabledBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('disabledBadge')).not.toBeInTheDocument();
  });

  it('renders disabled badge when rule is disabled', () => {
    mockUseRule.mockReturnValue({ ...baseRule, enabled: false });
    wrap(<RuleTitleWithBadges />);
    expect(screen.getByTestId('disabledBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('enabledBadge')).not.toBeInTheDocument();
  });
});
