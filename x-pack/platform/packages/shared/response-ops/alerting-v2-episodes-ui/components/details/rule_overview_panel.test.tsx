/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeRuleOverviewPanel } from './rule_overview_panel';

const mockRule = {
  id: 'rule-1',
  enabled: true,
  kind: 'signal',
  metadata: { name: 'My rule' },
  evaluation: { query: { base: 'FROM logs-* | WHERE foo=1' } },
} as unknown as RuleResponse;

const mockRuleDetailsHref = '/rules/rule-1';

describe('AlertEpisodeRuleOverviewPanel', () => {
  it('renders the rule name, esql code block and view-rule-details link', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanel rule={mockRule} ruleDetailsHref={mockRuleDetailsHref} />
      </I18nProvider>
    );

    expect(screen.getByText('My rule')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleQueryCodeBlock')).toHaveTextContent(
      'FROM logs-* | WHERE foo=1'
    );
    const viewBtn = screen.getByTestId('alertingV2EpisodeDetailsViewRuleDetailsButton');
    expect(viewBtn).toHaveAttribute('href', '/rules/rule-1');
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewPanel')).toBeInTheDocument();
  });
});
