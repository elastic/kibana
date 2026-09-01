/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MatchedPolicyReason, getMatchedTags } from './matched_policy_reason';

const renderComponent = (props: React.ComponentProps<typeof MatchedPolicyReason>) =>
  render(
    <IntlProvider locale="en">
      <MatchedPolicyReason {...props} />
    </IntlProvider>
  );

describe('getMatchedTags', () => {
  it('returns the intersection when some tags match', () => {
    expect(getMatchedTags(['env:prod', 'team:sre'], ['env:prod', 'other'])).toEqual(['env:prod']);
  });

  it('returns all matching tags when the full clause intersects', () => {
    expect(getMatchedTags(['env:prod', 'team:sre'], ['env:prod', 'team:sre', 'extra'])).toEqual([
      'env:prod',
      'team:sre',
    ]);
  });

  it('falls back to matcherTags when there is no intersection', () => {
    expect(getMatchedTags(['env:prod'], ['team:sre'])).toEqual(['env:prod']);
  });

  it('falls back to matcherTags when ruleTags is empty', () => {
    expect(getMatchedTags(['env:prod'], [])).toEqual(['env:prod']);
  });

  it('is case-sensitive — Env:Prod does not match env:prod', () => {
    expect(getMatchedTags(['Env:Prod'], ['env:prod'])).toEqual(['Env:Prod']);
  });
});

describe('MatchedPolicyReason', () => {
  it('renders a catch-all badge for the catch-all category', () => {
    renderComponent({ category: 'catch-all', matcher: null, ruleTags: [] });

    expect(screen.getByTestId('matchedPolicyReasonCatchAll')).toBeInTheDocument();
    expect(screen.getByText('Catch-all')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonTags')).not.toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonExpression')).not.toBeInTheDocument();
  });

  it('renders a tags badge with the matched tag count', () => {
    renderComponent({
      category: 'tags',
      matcher: { tags: ['env:prod', 'team:sre'] },
      ruleTags: ['env:prod', 'other'],
    });

    expect(screen.getByTestId('matchedPolicyReasonTags')).toBeInTheDocument();
    // Intersection: only env:prod matches → count = 1
    expect(screen.getByText('Tags (1)')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonCatchAll')).not.toBeInTheDocument();
  });

  it('falls back to showing all matcher tags when the rule carries none', () => {
    renderComponent({
      category: 'tags',
      matcher: { tags: ['env:prod', 'team:sre'] },
      ruleTags: [],
    });

    // Fallback: show all matcher tags (count = 2)
    expect(screen.getByText('Tags (2)')).toBeInTheDocument();
  });

  it('renders an expression badge', () => {
    renderComponent({
      category: 'tags',
      matcher: { expression: 'rule.name: "checkout"' },
      ruleTags: [],
    });

    expect(screen.getByTestId('matchedPolicyReasonExpression')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonCatchAll')).not.toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonTags')).not.toBeInTheDocument();
  });

  it('renders both tags and expression badges when the matcher has both clauses', () => {
    renderComponent({
      category: 'tags',
      matcher: { tags: ['env:prod'], expression: 'rule.name: "checkout"' },
      ruleTags: ['env:prod'],
    });

    expect(screen.getByTestId('matchedPolicyReasonTags')).toBeInTheDocument();
    expect(screen.getByTestId('matchedPolicyReasonExpression')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonCatchAll')).not.toBeInTheDocument();
  });

  it('shows the catch-all tooltip on hover', async () => {
    renderComponent({ category: 'catch-all', matcher: null, ruleTags: [] });

    await userEvent.hover(screen.getByTestId('matchedPolicyReasonCatchAll'));

    expect(await screen.findByText('Applies to every rule.')).toBeInTheDocument();
  });

  it('shows the matched tags in the tags badge tooltip', async () => {
    renderComponent({
      category: 'tags',
      matcher: { tags: ['env:prod', 'team:sre'] },
      ruleTags: ['env:prod'],
    });

    await userEvent.hover(screen.getByTestId('matchedPolicyReasonTags'));

    expect(await screen.findByText('Matching rule tags: env:prod')).toBeInTheDocument();
  });

  it('shows the expression in the expression badge tooltip', async () => {
    renderComponent({
      category: 'tags',
      matcher: { expression: 'rule.id: "my-rule"' },
      ruleTags: [],
    });

    await userEvent.hover(screen.getByTestId('matchedPolicyReasonExpression'));

    // Tooltip title is the static label; expression text is rendered in EuiCode inside content
    expect(await screen.findByText('rule.id: "my-rule"')).toBeInTheDocument();
  });
});
