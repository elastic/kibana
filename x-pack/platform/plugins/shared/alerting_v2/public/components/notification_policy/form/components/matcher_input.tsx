/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MATCHER_CONTEXT_FIELDS,
  type MatcherContextFieldDescriptor,
} from '@kbn/alerting-v2-schemas';
import React, { useCallback, useRef, useState } from 'react';

const KQL_OPERATORS = new Set(['and', 'or', 'not']);
const TOKEN_DELIMITERS = /[\s:()"/]/;

interface MatcherInputProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  fullWidth?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
}

interface TokenInfo {
  token: string;
  start: number;
  end: number;
}

const extractCurrentToken = (value: string, cursorPos: number): TokenInfo | null => {
  if (cursorPos === 0 || value.length === 0) {
    return null;
  }

  let start = cursorPos;
  while (start > 0 && !TOKEN_DELIMITERS.test(value[start - 1])) {
    start--;
  }

  let end = cursorPos;
  while (end < value.length && !TOKEN_DELIMITERS.test(value[end])) {
    end++;
  }

  const token = value.slice(start, end);
  if (token.length === 0 || KQL_OPERATORS.has(token.toLowerCase())) {
    return null;
  }

  return { token, start, end };
};

const filterSuggestions = (token: string): MatcherContextFieldDescriptor[] => {
  const lower = token.toLowerCase();
  return MATCHER_CONTEXT_FIELDS.filter((f) => f.path.toLowerCase().startsWith(lower));
};

export const MatcherInput: React.FC<MatcherInputProps> = ({
  value,
  onChange,
  inputRef,
  fullWidth,
  placeholder,
  'data-test-subj': dataTestSubj,
}) => {
  const [suggestions, setSuggestions] = useState<MatcherContextFieldDescriptor[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tokenRef = useRef<TokenInfo | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
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
    const tokenInfo = extractCurrentToken(input, cursorPos);
    tokenRef.current = tokenInfo;

    if (tokenInfo) {
      const matches = filterSuggestions(tokenInfo.token);
      setSuggestions(matches);
      setIsPopoverOpen(matches.length > 0);
      setSelectedIndex(0);
    } else {
      setIsPopoverOpen(false);
    }
  }, []);

  const applySuggestion = useCallback(
    (field: MatcherContextFieldDescriptor) => {
      const token = tokenRef.current;
      if (!token) return;

      const currentValue = valueRef.current;
      const before = currentValue.slice(0, token.start);
      const after = currentValue.slice(token.end);
      const newValue = before + field.path + after;
      onChange(newValue);
      setIsPopoverOpen(false);

      requestAnimationFrame(() => {
        const newCursorPos = token.start + field.path.length;
        internalInputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        internalInputRef.current?.focus();
      });
    },
    [onChange]
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

  return (
    <EuiInputPopover
      fullWidth={fullWidth}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      input={
        <EuiFieldText
          value={value}
          onChange={handleChange}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          inputRef={setInputRef}
          fullWidth={fullWidth}
          placeholder={placeholder}
          data-test-subj={dataTestSubj}
          aria-autocomplete="list"
        />
      }
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        style={{ maxHeight: 240, overflowY: 'auto' }}
        data-test-subj="matcherSuggestionsPanel"
      >
        {suggestions.map((field, index) => (
          <EuiFlexGroup
            key={field.path}
            alignItems="center"
            gutterSize="s"
            responsive={false}
            role="option"
            aria-selected={index === selectedIndex}
            onMouseDown={(e: React.MouseEvent) => {
              e.preventDefault();
              applySuggestion(field);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            css={css`
              padding: 6px 12px;
              cursor: pointer;
              background-color: ${index === selectedIndex
                ? 'var(--euiColorLightestShade)'
                : 'transparent'};
              &:hover {
                background-color: var(--euiColorLightestShade);
              }
            `}
            data-test-subj={`matcherSuggestion-${field.path}`}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{field.path}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{field.type}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {field.description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    </EuiInputPopover>
  );
};
