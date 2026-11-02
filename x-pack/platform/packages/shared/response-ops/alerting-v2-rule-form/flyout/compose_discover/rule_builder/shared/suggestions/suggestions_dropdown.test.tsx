/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiFieldText } from '@elastic/eui';
import { SuggestionsDropdown } from './suggestions_dropdown';
import type { ExpressionSuggestion } from './types';

const suggestions: ExpressionSuggestion[] = [
  { type: 'metric', text: 'foo', start: 0, end: 0 },
  { type: 'metric', text: 'bar', start: 0, end: 0 },
];

describe('SuggestionsDropdown', () => {
  it('renders an option per suggestion when open', () => {
    render(
      <SuggestionsDropdown
        input={<EuiFieldText value="" onChange={() => {}} compressed />}
        isOpen
        closePopover={() => {}}
        suggestions={suggestions}
        activeIndex={null}
        onSelect={() => {}}
        onMouseEnterIndex={() => {}}
        listId="test-list"
        testSubjPrefix="testSuggestions"
      />
    );

    expect(screen.getByTestId('testSuggestions-option-foo')).toBeInTheDocument();
    expect(screen.getByTestId('testSuggestions-option-bar')).toBeInTheDocument();
  });

  it('does not render the listbox when there are no suggestions', () => {
    render(
      <SuggestionsDropdown
        input={<EuiFieldText value="" onChange={() => {}} compressed />}
        isOpen
        closePopover={() => {}}
        suggestions={[]}
        activeIndex={null}
        onSelect={() => {}}
        onMouseEnterIndex={() => {}}
        listId="test-list"
        testSubjPrefix="testSuggestions"
      />
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the active suggestion as selected', () => {
    render(
      <SuggestionsDropdown
        input={<EuiFieldText value="" onChange={() => {}} compressed />}
        isOpen
        closePopover={() => {}}
        suggestions={suggestions}
        activeIndex={1}
        onSelect={() => {}}
        onMouseEnterIndex={() => {}}
        listId="test-list"
        testSubjPrefix="testSuggestions"
      />
    );

    expect(screen.getByTestId('testSuggestions-option-foo')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByTestId('testSuggestions-option-bar')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('calls onSelect with the clicked suggestion', () => {
    const onSelect = jest.fn();
    render(
      <SuggestionsDropdown
        input={<EuiFieldText value="" onChange={() => {}} compressed />}
        isOpen
        closePopover={() => {}}
        suggestions={suggestions}
        activeIndex={null}
        onSelect={onSelect}
        onMouseEnterIndex={() => {}}
        listId="test-list"
        testSubjPrefix="testSuggestions"
      />
    );

    screen.getByTestId('testSuggestions-option-bar').click();

    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
  });
});
