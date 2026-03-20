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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useId, useMemo } from 'react';
import type { SuggestionItem } from './matcher_suggestions';
import { useMatcherSuggestions } from './use_matcher_suggestions';

interface MatcherInputProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  fullWidth?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
}

export const MatcherInput = ({
  value,
  onChange,
  inputRef,
  fullWidth,
  placeholder,
  'data-test-subj': dataTestSubj,
}: MatcherInputProps) => {
  const { euiTheme } = useEuiTheme();
  const listboxId = useId();

  const {
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
  } = useMatcherSuggestions({ value, onChange, inputRef });

  const baseItemStyle = useMemo(
    () => css`
      padding: 6px 12px;
      cursor: pointer;
      &:hover {
        background-color: ${euiTheme.colors.highlight};
      }
    `,
    [euiTheme.colors.highlight]
  );

  const selectedItemStyle = useMemo(
    () => css`
      padding: 6px 12px;
      cursor: pointer;
      background-color: ${euiTheme.colors.highlight};
    `,
    [euiTheme.colors.highlight]
  );

  const activeDescendant =
    isPopoverOpen && suggestions.length > 0 ? `${listboxId}-option-${selectedIndex}` : undefined;

  return (
    <EuiInputPopover
      fullWidth={fullWidth}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      ownFocus={false}
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
          aria-controls={isPopoverOpen ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
        />
      }
    >
      <div
        id={listboxId}
        role="listbox"
        style={{ maxHeight: 240, overflowY: 'auto' }}
        data-test-subj="matcherSuggestionsPanel"
      >
        {suggestions.map((item, index) => (
          <SuggestionRow
            key={item.label}
            id={`${listboxId}-option-${index}`}
            item={item}
            isSelected={index === selectedIndex}
            baseStyle={baseItemStyle}
            selectedStyle={selectedItemStyle}
            onSelect={applySuggestion}
            onMouseEnter={() => setSelectedIndex(index)}
          />
        ))}
      </div>
    </EuiInputPopover>
  );
};

interface SuggestionRowProps {
  id: string;
  item: SuggestionItem;
  isSelected: boolean;
  baseStyle: ReturnType<typeof css>;
  selectedStyle: ReturnType<typeof css>;
  onSelect: (item: SuggestionItem) => void;
  onMouseEnter: () => void;
}

const SuggestionRow = React.memo(
  ({
    id,
    item,
    isSelected,
    baseStyle,
    selectedStyle,
    onSelect,
    onMouseEnter,
  }: SuggestionRowProps) => (
    <EuiFlexGroup
      id={id}
      alignItems="center"
      gutterSize="s"
      responsive={false}
      role="option"
      aria-selected={isSelected}
      onMouseDown={(e: React.MouseEvent) => {
        e.preventDefault();
        onSelect(item);
      }}
      onMouseEnter={onMouseEnter}
      css={isSelected ? selectedStyle : baseStyle}
      data-test-subj={`matcherSuggestion-${item.label}`}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{item.label}</strong>
        </EuiText>
      </EuiFlexItem>
      {item.type && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{item.type}</EuiBadge>
        </EuiFlexItem>
      )}
      {item.description && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {item.description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);

SuggestionRow.displayName = 'SuggestionRow';
