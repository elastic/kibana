/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactElement } from 'react';
import { EuiInputPopover, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ExpressionSuggestion } from './types';

export interface SuggestionsDropdownProps {
  /** The field the popover is anchored to; rendered as-is by `EuiInputPopover`. */
  readonly input: ReactElement;
  readonly isOpen: boolean;
  readonly closePopover: () => void;
  readonly suggestions: readonly ExpressionSuggestion[];
  readonly activeIndex: number | null;
  readonly onSelect: (suggestion: ExpressionSuggestion) => void;
  readonly onMouseEnterIndex: (index: number) => void;
  /** Id of the listbox, referenced by the input's `aria-controls`/`aria-activedescendant`. */
  readonly listId: string;
  /** Prefix used to build a stable `data-test-subj` per option. */
  readonly testSubjPrefix: string;
}

export const SuggestionsDropdown: React.FC<SuggestionsDropdownProps> = ({
  input,
  isOpen,
  closePopover,
  suggestions,
  activeIndex,
  onSelect,
  onMouseEnterIndex,
  listId,
  testSubjPrefix,
}) => {
  const { euiTheme } = useEuiTheme();

  const optionStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    cursor: pointer;
  `;
  const activeOptionStyles = css`
    ${optionStyles};
    background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
  `;

  return (
    <EuiInputPopover
      input={input}
      isOpen={isOpen && suggestions.length > 0}
      closePopover={closePopover}
      disableFocusTrap
      ownFocus={false}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      fullWidth
      data-test-subj={`${testSubjPrefix}Popover`}
    >
      <div id={listId} role="listbox">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${suggestion.text}`}
            id={`${listId}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            css={index === activeIndex ? activeOptionStyles : optionStyles}
            data-test-subj={`${testSubjPrefix}-option-${suggestion.text}`}
            // Virtual focus (aria-activedescendant on the input) drives keyboard navigation, so
            // these options are intentionally excluded from the tab order (tabIndex={-1}); the
            // keydown handler exists for completeness in case they're ever reached by script.
            tabIndex={-1}
            // Selecting a suggestion must not steal focus away from the input being edited.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSelect(suggestion);
              }
            }}
            onMouseEnter={() => onMouseEnterIndex(index)}
          >
            <EuiText size="s">{suggestion.text}</EuiText>
          </div>
        ))}
      </div>
    </EuiInputPopover>
  );
};
