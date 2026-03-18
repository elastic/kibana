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

const baseRule = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'My Rule', labels: ['prod', 'infra'] },
} as RuleApiResponse;

const wrap = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RuleHeaderDescription', () => {
  it('renders tags as badges', () => {
    wrap(<RuleHeaderDescription rule={baseRule} />);
    expect(screen.getByTestId('ruleTags')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('infra')).toBeInTheDocument();
  });

  it('returns null when labels are empty', () => {
    const { container } = wrap(
      <RuleHeaderDescription rule={{ ...baseRule, metadata: { name: 'No Tags' } }} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when labels are undefined', () => {
    const rule = { ...baseRule, metadata: { name: 'No Labels' } } as RuleApiResponse;
    const { container } = wrap(<RuleHeaderDescription rule={rule} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('RuleTitleWithBadges', () => {
  it('renders the rule name', () => {
    wrap(<RuleTitleWithBadges rule={baseRule} />);
    expect(screen.getByTestId('ruleName')).toHaveTextContent('My Rule');
  });

  it('renders kind as Detect only for signal rules', () => {
    wrap(<RuleTitleWithBadges rule={baseRule} />);
    expect(screen.getByTestId('kindBadge')).toHaveTextContent('Detect only');
  });

  it('renders kind as Alert for alert rules', () => {
    wrap(<RuleTitleWithBadges rule={{ ...baseRule, kind: 'alert' }} />);
    expect(screen.getByTestId('kindBadge')).toHaveTextContent('Alert');
  });

  it('renders enabled badge when rule is enabled', () => {
    wrap(<RuleTitleWithBadges rule={baseRule} />);
    expect(screen.getByTestId('enabledBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('disabledBadge')).not.toBeInTheDocument();
  });

  it('renders disabled badge when rule is disabled', () => {
    wrap(<RuleTitleWithBadges rule={{ ...baseRule, enabled: false }} />);
    expect(screen.getByTestId('disabledBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('enabledBadge')).not.toBeInTheDocument();
  });
});
