/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleSummaryRunbookCard } from './rule_summary_runbook_card';

const renderCard = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleSummaryRunbookCard rule={rule} />
    </I18nProvider>
  );

const baseRule = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'My Rule' },
} as RuleApiResponse;

describe('RuleSummaryRunbookCard', () => {
  it('renders the empty prompt when the rule has no runbook', () => {
    renderCard({ ...baseRule, artifacts: [] });

    expect(screen.getByTestId('ruleSummaryRunbookEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleSummaryRunbookToggle')).not.toBeInTheDocument();
  });

  it('renders runbook markdown and toggles the full guide when content overflows', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 400;
      },
    });

    renderCard({
      ...baseRule,
      artifacts: [{ id: 'runbook-1', type: 'runbook', data: { content: '# Guide\n\nDetails' } }],
    } as RuleApiResponse);

    expect(screen.getByTestId('ruleSummaryRunbookContent')).toHaveTextContent('Guide');
    fireEvent.click(screen.getByTestId('ruleSummaryRunbookToggle'));
    expect(screen.getByTestId('ruleSummaryRunbookToggle')).toHaveTextContent('Hide full guide');

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 0;
      },
    });
  });
});
