/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { css } from '@emotion/react';
import React from 'react';
import type { SuggestionItem } from './matcher_suggestions';

interface SuggestionRowProps {
  id: string;
  item: SuggestionItem;
  isSelected: boolean;
  baseStyle: ReturnType<typeof css>;
  selectedStyle: ReturnType<typeof css>;
  onSelect: (item: SuggestionItem) => void;
  onMouseEnter: () => void;
}

export const SuggestionRow = React.memo(
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
