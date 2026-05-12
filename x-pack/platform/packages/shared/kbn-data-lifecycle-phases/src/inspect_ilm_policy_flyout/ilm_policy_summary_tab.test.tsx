/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import type { Phases } from '@kbn/index-lifecycle-management-common-shared';
import { IlmPolicySummaryTab, PhaseAccordion } from './ilm_policy_summary_tab';

describe('IlmPolicySummaryTab', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('renders only present phases and preserves canonical phase order', () => {
    const phases: Phases = {
      delete: { min_age: '90d', actions: { delete: {} } },
      hot: { min_age: '0ms', actions: {} },
      warm: { min_age: '7d', actions: {} },
    };

    renderWithTheme(<IlmPolicySummaryTab phases={phases} />);

    const accordions = screen.getAllByTestId(/^ilmPhaseAccordion-/);
    const ids = accordions.map((el) => el.getAttribute('data-test-subj'));
    expect(ids).toEqual([
      'ilmPhaseAccordion-hot',
      'ilmPhaseAccordion-warm',
      'ilmPhaseAccordion-delete',
    ]);
  });

  it('does not render accordions for missing phases', () => {
    const phases: Phases = { delete: { min_age: '90d', actions: { delete: {} } } };

    renderWithTheme(<IlmPolicySummaryTab phases={phases} />);

    expect(screen.queryByTestId('ilmPhaseAccordion-hot')).toBeNull();
    expect(screen.queryByTestId('ilmPhaseAccordion-warm')).toBeNull();
    expect(screen.queryByTestId('ilmPhaseAccordion-cold')).toBeNull();
    expect(screen.queryByTestId('ilmPhaseAccordion-frozen')).toBeNull();
    expect(screen.queryByTestId('ilmPhaseAccordion-delete')).not.toBeNull();
  });
});

describe('PhaseAccordion', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('renders the min_age badge for phases with min_age != 0ms', () => {
    const phases: Phases = {
      warm: { min_age: '7d', actions: {} },
    };

    renderWithTheme(<PhaseAccordion phase="warm" phases={phases} />);
    expect(screen.getByTestId('ilmPhaseAccordionMinAge-warm').textContent).toContain('7d');
  });

  it('does not render the min_age badge when min_age is 0ms', () => {
    const phases: Phases = {
      hot: { min_age: '0ms', actions: {} },
    };

    renderWithTheme(<PhaseAccordion phase="hot" phases={phases} />);
    expect(screen.queryByTestId('ilmPhaseAccordionMinAge-hot')).toBeNull();
  });

  it('renders no content area when buildPhaseContent returns empty sections', () => {
    const phases: Phases = {
      frozen: { min_age: '90d', actions: {} },
    };

    renderWithTheme(<PhaseAccordion phase="frozen" phases={phases} />);

    expect(screen.queryByTestId('ilmPhaseAccordion-frozen')).not.toBeNull();
    expect(screen.queryByTestId('ilmPhaseAccordionContent-frozen')).toBeNull();
  });
});
