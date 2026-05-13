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

const mockGetRuleDetailsHref = (id: string) => `/rules/${id}`;

describe('AlertEpisodeRuleOverviewPanel', () => {
  it('renders the rule name, esql code block and view-rule-details link when not collapsible', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanel
          rule={mockRule}
          collapsible={false}
          getRuleDetailsHref={mockGetRuleDetailsHref}
        />
      </I18nProvider>
    );

    expect(screen.getByText('My rule')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleQueryCodeBlock')).toHaveTextContent(
      'FROM logs-* | WHERE foo=1'
    );
    const viewBtn = screen.getByTestId('alertingV2EpisodeDetailsViewRuleDetailsButton');
    expect(viewBtn).toHaveAttribute('href', '/rules/rule-1');
    expect(
      screen.queryByTestId('alertingV2EpisodeDetailsRuleOverviewAccordion')
    ).not.toBeInTheDocument();
  });

  it('wraps the panel in an accordion when collapsible', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanel
          rule={mockRule}
          collapsible={true}
          getRuleDetailsHref={mockGetRuleDetailsHref}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewAccordion')).toBeInTheDocument();
  });
});
