/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleSummaryActionPoliciesSection } from './rule_summary_action_policies_section';

jest.mock('../../rule_details/overview/artifacts/action_policies_artifacts_subsection', () => ({
  ActionPoliciesArtifactsSubsection: ({
    flyoutSession,
    showTitle,
  }: {
    flyoutSession?: string;
    showTitle?: boolean;
  }) => (
    <div
      data-test-subj="mockActionPoliciesArtifacts"
      data-session={flyoutSession}
      data-show-title={String(showTitle)}
    />
  ),
}));

const rule = { id: 'rule-1' } as RuleApiResponse;

describe('RuleSummaryActionPoliciesSection', () => {
  it('uses one heading and opens policy details inside the summary flyout', () => {
    render(
      <I18nProvider>
        <RuleSummaryActionPoliciesSection rule={rule} />
      </I18nProvider>
    );

    expect(screen.getByTestId('ruleSummaryActionPolicies')).toHaveTextContent('Action policies');
    expect(
      screen
        .getByTestId('ruleSummaryActionPolicies')
        .querySelector('[data-euiicon-type="tablePlay"]')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifacts')).toHaveAttribute(
      'data-session',
      'inherit'
    );
    expect(screen.getByTestId('mockActionPoliciesArtifacts')).toHaveAttribute(
      'data-show-title',
      'false'
    );
  });
});
