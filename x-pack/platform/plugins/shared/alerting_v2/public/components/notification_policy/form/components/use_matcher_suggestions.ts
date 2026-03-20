/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import {
  applyInsertText,
  computeSuggestions,
  type SuggestionItem,
  type TokenInfo,
} from './matcher_suggestions';

interface UseMatcherSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const useMatcherSuggestions = ({
  value,
  onChange,
  inputRef,
}: UseMatcherSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tokenRef = useRef<TokenInfo | null>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);

  const setInputRef = useCallback(
    (el: HTMLInputElement | null) => {
      internalInputRef.current = el;
      if (typeof inputRef === 'function') {
        inputRef(el);
      } else if (inputRef && 'current' in inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    },
    [inputRef]
  );

  const updateSuggestions = useCallback((input: string, cursorPos: number) => {
    const result = computeSuggestions(input, cursorPos);
    tokenRef.current = result.token;
    setSuggestions(result.suggestions);
    setIsPopoverOpen(result.suggestions.length > 0);
    setSelectedIndex(0);
  }, []);

  const applySuggestion = useCallback(
    (item: SuggestionItem) => {
      const token = tokenRef.current;
      if (!token) return;

      const { newValue, newCursorPos } = applyInsertText(value, token, item.insertText);
      onChange(newValue);
      setIsPopoverOpen(false);

      requestAnimationFrame(() => {
        internalInputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        internalInputRef.current?.focus();
      });
    },
    [value, onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart ?? newValue.length;
      onChange(newValue);
      updateSuggestions(newValue, cursorPos);
    },
    [onChange, updateSuggestions]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      updateSuggestions(value, target.selectionStart ?? value.length);
    },
    [value, updateSuggestions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isPopoverOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
          break;
        case 'Escape':
          setIsPopoverOpen(false);
          break;
      }
    },
    [isPopoverOpen, suggestions, selectedIndex, applySuggestion]
  );

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  return {
    suggestions,
    isPopoverOpen,
    selectedIndex,
    setSelectedIndex,
    setInputRef,
    handleChange,
    handleClick,
    handleKeyDown,
    applySuggestion,
    closePopover,
  };
};
