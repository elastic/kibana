/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent, SyntheticEvent } from 'react';
import { insertSuggestion } from './insert_suggestion';
import type { ExpressionSuggestion, SuggestionsProvider } from './types';

export interface UseSuggestionsInputParams {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly provider: SuggestionsProvider;
  /** Id of the listbox rendered by `SuggestionsDropdown`; must be unique per input on the page. */
  readonly listId: string;
}

export interface UseSuggestionsInputInputProps {
  readonly value: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onBlur: () => void;
  readonly onSelect: (event: SyntheticEvent<HTMLInputElement>) => void;
  readonly inputRef: (node: HTMLInputElement | null) => void;
  readonly role: 'combobox';
  readonly 'aria-autocomplete': 'list';
  readonly 'aria-expanded': boolean;
  readonly 'aria-controls': string;
  readonly 'aria-activedescendant': string | undefined;
}

export interface UseSuggestionsInputDropdownProps {
  readonly isOpen: boolean;
  readonly closePopover: () => void;
  readonly suggestions: readonly ExpressionSuggestion[];
  readonly activeIndex: number | null;
  readonly onSelect: (suggestion: ExpressionSuggestion) => void;
  readonly onMouseEnterIndex: (index: number) => void;
  readonly listId: string;
}

export interface UseSuggestionsInputResult {
  readonly inputProps: UseSuggestionsInputInputProps;
  readonly dropdownProps: UseSuggestionsInputDropdownProps;
}

/**
 * Wires a `SuggestionsProvider` to a text input: computes suggestions as the user types, moves
 * the cursor, or focuses the field; handles arrow/Enter/Escape keyboard navigation; and applies
 * a selected suggestion at the right position, restoring the cursor afterwards.
 *
 * Returns props to spread onto the input and onto `SuggestionsDropdown` (which owns rendering).
 */
export const useSuggestionsInput = ({
  value,
  onChange,
  provider,
  listId,
}: UseSuggestionsInputParams): UseSuggestionsInputResult => {
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);
  // `setSelectionRange` below fires a native `select` event, same as the user moving the
  // cursor themselves — this flag lets `handleSelectionChange` tell our own restoration apart
  // from a real user action, so it doesn't immediately reopen the dropdown right after closing
  // it (e.g. selecting "foo" would otherwise re-suggest "foo" to itself once the cursor lands
  // right after it, since the just-inserted text is trivially a prefix of itself).
  const suppressNextSelectionEventRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<readonly ExpressionSuggestion[]>([]);
  // Bumped on every suggestion selection to force the cursor-restoration effect below to run.
  // It can't key off of `value` instead: selecting a suggestion that exactly matches what was
  // already typed (e.g. typing the full "foo" and pressing Enter) produces the same string, so
  // React sees no change and skips the effect — leaving `pendingCursorRef` stale until the next
  // *real* value change (e.g. typing a space right after) wrongly consumes it, snapping the
  // cursor back to the old position instead of after the space.
  const [cursorRestoreToken, setCursorRestoreToken] = useState(0);

  // Restores the cursor position after a suggestion is applied, once the input has re-rendered
  // with the new text (setSelectionRange on the old text would be a no-op/wrong).
  useEffect(() => {
    if (pendingCursorRef.current !== null) {
      suppressNextSelectionEventRef.current = true;
      inputElementRef.current?.setSelectionRange(
        pendingCursorRef.current,
        pendingCursorRef.current
      );
      pendingCursorRef.current = null;
    }
  }, [cursorRestoreToken]);

  const updateSuggestions = useCallback(
    (nextValue: string, selectionStart: number, selectionEnd: number) => {
      const nextSuggestions = provider({ value: nextValue, selectionStart, selectionEnd });
      setSuggestions(nextSuggestions);
      setActiveIndex(nextSuggestions.length > 0 ? 0 : null);
      setIsOpen(nextSuggestions.length > 0);
    },
    [provider]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      onChange(nextValue);
      updateSuggestions(
        nextValue,
        event.target.selectionStart ?? nextValue.length,
        event.target.selectionEnd ?? nextValue.length
      );
    },
    [onChange, updateSuggestions]
  );

  // Fires on focus, click, or caret movement via arrow keys — anything that can change the
  // cursor position without changing the text itself.
  const handleSelectionChange = useCallback(
    (event: SyntheticEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>) => {
      if (suppressNextSelectionEventRef.current) {
        suppressNextSelectionEventRef.current = false;
        return;
      }
      const target = event.currentTarget;
      updateSuggestions(
        target.value,
        target.selectionStart ?? target.value.length,
        target.selectionEnd ?? target.value.length
      );
    },
    [updateSuggestions]
  );

  const closePopover = useCallback(() => setIsOpen(false), []);

  const selectSuggestion = useCallback(
    (suggestion: ExpressionSuggestion) => {
      const { value: nextValue, cursor } = insertSuggestion(value, suggestion);
      pendingCursorRef.current = cursor;
      setCursorRestoreToken((token) => token + 1);
      onChange(nextValue);
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(null);
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((current) => ((current ?? -1) + 1) % suggestions.length);
          return;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex(
            (current) => ((current ?? 0) - 1 + suggestions.length) % suggestions.length
          );
          return;
        case 'Enter':
          if (activeIndex !== null) {
            event.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
          }
          return;
        case 'Escape':
          event.preventDefault();
          closePopover();
          return;
        default:
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion, closePopover]
  );

  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputElementRef.current = node;
  }, []);

  return {
    inputProps: {
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: handleSelectionChange,
      onBlur: closePopover,
      onSelect: handleSelectionChange,
      inputRef: setInputRef,
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': isOpen,
      'aria-controls': listId,
      'aria-activedescendant': activeIndex !== null ? `${listId}-option-${activeIndex}` : undefined,
    },
    dropdownProps: {
      isOpen,
      closePopover,
      suggestions,
      activeIndex,
      onSelect: selectSuggestion,
      onMouseEnterIndex: setActiveIndex,
      listId,
    },
  };
};
