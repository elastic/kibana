/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { AdvancedMatchingAccordion } from './advanced_matching_accordion';

jest.mock('../matcher_input', () => ({
  MatcherInput: (props: {
    value: string;
    onChange: (v: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={props['data-test-subj'] ?? 'matcherInput'}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const getAccordionButton = () =>
  screen.getByRole('button', { name: /Advanced matching|Match conditions/i });

describe('AdvancedMatchingAccordion', () => {
  it('renders the accordion with Advanced matching label', () => {
    renderWithI18n(<AdvancedMatchingAccordion matcher={null} onChange={jest.fn()} />);

    expect(screen.getByText('Advanced matching')).toBeInTheDocument();
  });

  it('starts collapsed when matcher.expression is null', () => {
    renderWithI18n(
      <AdvancedMatchingAccordion matcher={{ expression: null }} onChange={jest.fn()} />
    );

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts collapsed when matcher is null', () => {
    renderWithI18n(<AdvancedMatchingAccordion matcher={null} onChange={jest.fn()} />);

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts expanded when matcher.expression is set', () => {
    renderWithI18n(
      <AdvancedMatchingAccordion matcher={{ expression: 'data.host:"x"' }} onChange={jest.fn()} />
    );

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts expanded when matcher.expression is a non-empty trimmed string', () => {
    renderWithI18n(
      <AdvancedMatchingAccordion
        matcher={{ expression: '  rule.id:"abc"  ' }}
        onChange={jest.fn()}
      />
    );

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onChange when input changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithI18n(
      <AdvancedMatchingAccordion matcher={{ expression: 'data.host:"x"' }} onChange={onChange} />
    );

    await user.type(screen.getByTestId('matcherInput'), 'a');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ expression: 'data.host:"x"a' })
    );
  });

  it('calls onChange with expression: null when input is cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithI18n(<AdvancedMatchingAccordion matcher={{ expression: 'x' }} onChange={onChange} />);

    await user.clear(screen.getByTestId('matcherInput'));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ expression: null }));
  });

  it('expands accordion when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(<AdvancedMatchingAccordion matcher={null} onChange={jest.fn()} />);

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(getAccordionButton());

    expect(getAccordionButton()).toHaveAttribute('aria-expanded', 'true');
  });
});
