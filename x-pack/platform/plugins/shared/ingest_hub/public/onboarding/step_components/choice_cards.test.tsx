/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ChoiceCards } from './choice_cards';

const OPTIONS = [
  { value: 'a', name: 'Alpha', description: 'First choice.', isRecommended: true },
  { value: 'b', name: 'Beta', description: 'Second choice.' },
];

function renderCards(props: Partial<React.ComponentProps<typeof ChoiceCards<string>>> = {}) {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <ChoiceCards
        options={OPTIONS}
        selectedValue="a"
        onChange={onChange}
        testSubjPrefix="test-card"
        {...props}
      />
    </I18nProvider>
  );
  return { onChange };
}

const input = (value: string) =>
  screen.getByTestId(`test-card-${value}`).querySelector('input') as HTMLInputElement;

describe('ChoiceCards', () => {
  it('renders the name and the help text of every option', () => {
    renderCards();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('First choice.')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Second choice.')).toBeInTheDocument();
  });

  it('shows the Recommended badge on the recommended option only', () => {
    renderCards();
    const badges = screen.getAllByText('Recommended');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('.euiCheckableCard')?.textContent).toContain('Alpha');
  });

  it('checks the selected option', () => {
    renderCards({ selectedValue: 'b' });
    expect(input('b').checked).toBe(true);
    expect(input('a').checked).toBe(false);
  });

  it('calls onChange with the value of the picked option', () => {
    const { onChange } = renderCards();
    fireEvent.click(input('b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('disables every card when disabled', () => {
    renderCards({ disabled: true });
    expect(input('a')).toBeDisabled();
    expect(input('b')).toBeDisabled();
  });
});
