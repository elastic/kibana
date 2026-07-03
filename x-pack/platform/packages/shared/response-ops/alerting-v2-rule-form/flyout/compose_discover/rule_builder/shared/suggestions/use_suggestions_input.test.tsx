/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createLabelSuggestionsProvider } from './create_label_suggestions_provider';
import { useSuggestionsInput } from './use_suggestions_input';
import type { SuggestionsProvider } from './types';

const TestInput: React.FC<{ initialValue?: string; provider: SuggestionsProvider }> = ({
  initialValue = '',
  provider,
}) => {
  const [value, setValue] = useState(initialValue);
  const {
    inputProps: { inputRef, ...inputProps },
    dropdownProps,
  } = useSuggestionsInput({
    value,
    onChange: setValue,
    provider,
    listId: 'test-list',
  });

  return (
    <>
      <input data-test-subj="testInput" ref={inputRef} {...inputProps} />
      {dropdownProps.isOpen && (
        <ul role="listbox" id={dropdownProps.listId}>
          {dropdownProps.suggestions.map((suggestion, index) => (
            <li
              key={suggestion.text}
              role="option"
              aria-selected={index === dropdownProps.activeIndex}
              onClick={() => dropdownProps.onSelect(suggestion)}
            >
              {suggestion.text}
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const setCursor = (input: HTMLInputElement, value: string, position: number) => {
  fireEvent.change(input, { target: { value, selectionStart: position, selectionEnd: position } });
};

describe('useSuggestionsInput', () => {
  const provider = createLabelSuggestionsProvider(['foo', 'bar'], 'metric');

  it('opens the dropdown with suggestions matching what was typed', () => {
    render(<TestInput provider={provider} />);
    const input = screen.getByTestId('testInput') as HTMLInputElement;

    setCursor(input, 'f', 1);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['foo']);
  });

  it('inserts the clicked suggestion, replacing what was typed, and closes the dropdown', () => {
    render(<TestInput provider={provider} />);
    const input = screen.getByTestId('testInput') as HTMLInputElement;

    setCursor(input, 'f', 1);
    fireEvent.click(screen.getByRole('option', { name: 'foo' }));

    expect(input.value).toBe('foo');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates suggestions with arrow keys and selects the active one on Enter', () => {
    render(<TestInput provider={provider} />);
    const input = screen.getByTestId('testInput') as HTMLInputElement;

    // Focusing an already-empty input doesn't change its value, so `fireEvent.change` (which
    // relies on React detecting a value diff) would be a no-op here — `focus` triggers our
    // `onFocus` handler regardless of whether the value changed.
    fireEvent.focus(input);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['foo', 'bar']);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'bar' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value).toBe('bar');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the dropdown without changing the value on Escape', () => {
    render(<TestInput provider={provider} />);
    const input = screen.getByTestId('testInput') as HTMLInputElement;

    setCursor(input, 'f', 1);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input.value).toBe('f');
  });
});
