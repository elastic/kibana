/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { PolicyScopeDescription } from './policy_scope_description';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('PolicyScopeDescription', () => {
  it('shows catch-all copy when matcher is null', () => {
    renderWithI18n(<PolicyScopeDescription matcher={null} />);

    expect(screen.getByText('Applies to all alerts in the space')).toBeInTheDocument();
  });

  it('shows catch-all copy when matcher is empty object', () => {
    renderWithI18n(<PolicyScopeDescription matcher={{}} />);

    expect(screen.getByText('Applies to all alerts in the space')).toBeInTheDocument();
  });

  it('shows tags-only copy when tags are set and expression is absent', () => {
    renderWithI18n(<PolicyScopeDescription matcher={{ tags: ['prod'] }} />);

    expect(
      screen.getByText('Applies to all rules with one or more of the selected tags')
    ).toBeInTheDocument();
  });

  it('shows tags-only copy when tags are set and expression is null', () => {
    renderWithI18n(<PolicyScopeDescription matcher={{ tags: ['prod'], expression: null }} />);

    expect(
      screen.getByText('Applies to all rules with one or more of the selected tags')
    ).toBeInTheDocument();
  });

  it('shows tags+expression copy when both tags and expression are set', () => {
    renderWithI18n(
      <PolicyScopeDescription matcher={{ tags: ['prod'], expression: 'data.host:"x"' }} />
    );

    expect(
      screen.getByText(
        'Applies to all rules with one or more of the selected tags, and matching the expression conditions'
      )
    ).toBeInTheDocument();
  });

  it('shows expression-only copy when expression is set and tags are absent', () => {
    renderWithI18n(<PolicyScopeDescription matcher={{ expression: 'data.host:"x"' }} />);

    expect(
      screen.getByText('Applies to all alerts matching the expression conditions')
    ).toBeInTheDocument();
  });

  it('shows expression-only copy when expression is set and tags are null', () => {
    renderWithI18n(
      <PolicyScopeDescription matcher={{ tags: null, expression: 'data.host:"x"' }} />
    );

    expect(
      screen.getByText('Applies to all alerts matching the expression conditions')
    ).toBeInTheDocument();
  });

  it('shows the description line', () => {
    renderWithI18n(<PolicyScopeDescription matcher={null} />);

    expect(
      screen.getByText(
        'Define which alert episodes this policy applies to. Select rule tags (joined with OR) and/or add a KQL match expression in advanced matching.'
      )
    ).toBeInTheDocument();
  });
});
