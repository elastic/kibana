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
  query: { base: 'FROM logs-* | WHERE foo=1' },
} as unknown as RuleResponse;

const alertRule = { ...mockRule, kind: 'alert' } as unknown as RuleResponse;

const mockRuleDetailsHref = '/rules/rule-1';

const renderPanel = (rule: RuleResponse) =>
  render(
    <I18nProvider>
      <AlertEpisodeRuleOverviewPanel rule={rule} ruleDetailsHref={mockRuleDetailsHref} />
    </I18nProvider>
  );

describe('AlertEpisodeRuleOverviewPanel', () => {
  it('renders the rule name, esql code block and view-rule-details link', () => {
    renderPanel(mockRule);

    expect(screen.getByText('My rule')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleQueryCodeBlock')).toHaveTextContent(
      'FROM logs-* | WHERE foo=1'
    );
    const viewBtn = screen.getByTestId('alertingV2EpisodeDetailsViewRuleDetailsButton');
    expect(viewBtn).toHaveAttribute('href', '/rules/rule-1');
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewPanel')).toBeInTheDocument();
  });

  it('renders the "Rule overview" heading by default, for the full details page', () => {
    renderPanel(mockRule);

    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewHeading')).toHaveTextContent(
      'Rule overview'
    );
  });

  it('hides the heading when showTitle is false, for the flyout accordion', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanel
          rule={mockRule}
          ruleDetailsHref={mockRuleDetailsHref}
          showTitle={false}
        />
      </I18nProvider>
    );

    expect(
      screen.queryByTestId('alertingV2EpisodeDetailsRuleOverviewHeading')
    ).not.toBeInTheDocument();
    // The link stays inside the panel either way.
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewPanel')).toContainElement(
      screen.getByTestId('alertingV2EpisodeDetailsViewRuleDetailsButton')
    );
  });

  it('scales the rule name and link down when compressed', () => {
    const { container: normal } = renderPanel(mockRule);
    const normalName = normal.querySelector('.euiText')?.className ?? '';

    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanel
          rule={mockRule}
          ruleDetailsHref={mockRuleDetailsHref}
          compressed
        />
      </I18nProvider>
    );

    // EuiText encodes its scale in the emotion class, so compressed must differ.
    const compressedName =
      screen.getAllByText('My rule').at(-1)?.closest('.euiText')?.className ?? '';
    expect(compressedName).not.toBe('');
    expect(compressedName).not.toBe(normalName);
  });

  it('renders the view-rule-details link inside the panel as a plain link', () => {
    renderPanel(mockRule);

    const link = screen.getByTestId('alertingV2EpisodeDetailsViewRuleDetailsButton');
    // A link, not the empty button it used to be, so it picks up normal link color.
    expect(link.tagName).toBe('A');
    expect(link.className).toContain('euiLink');
    expect(link.className).not.toContain('euiButtonEmpty');
    // The eye icon is gone, replaced by the external affordance for leaving the flyout.
    expect(link.querySelector('[data-euiicon-type="eye"]')).toBeNull();
    expect(link.querySelector('[data-euiicon-type="external"]')).toBeInTheDocument();
    // Top right of the panel rather than above it.
    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewPanel')).toContainElement(link);
  });

  it('renders "Events" kind badge for Events rules', () => {
    renderPanel(mockRule);

    const badge = screen.getByTestId('alertingV2EpisodeDetailsRuleKindBadge');
    expect(badge).toHaveTextContent('Events');
  });

  it('renders "Alerts" kind badge for Alerts rules', () => {
    renderPanel(alertRule);

    const badge = screen.getByTestId('alertingV2EpisodeDetailsRuleKindBadge');
    expect(badge).toHaveTextContent('Alerts');
  });

  it('renders composed query with breach segment (alert condition)', () => {
    const composedRule = {
      ...mockRule,
      query: {
        base: 'FROM logs-*',
        breach: { segment: '| WHERE foo > 10' },
      },
    } as RuleResponse;

    renderPanel(composedRule);

    expect(screen.getByTestId('alertingV2EpisodeDetailsRuleQueryCodeBlock')).toHaveTextContent(
      'FROM logs-* | WHERE foo > 10'
    );
  });
});
