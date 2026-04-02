/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface ActiveItemRowProps {
  id: string;
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  isRemoving?: boolean;
  removeAriaLabel: string;
  readOnlyContent?: React.ReactNode;
}

export const ActiveItemRow: React.FC<ActiveItemRowProps> = ({
  name,
  isSelected,
  onSelect,
  onRemove,
  isRemoving = false,
  removeAriaLabel,
  readOnlyContent,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      onClick={onSelect}
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        cursor: pointer;
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveHover
          : 'transparent'};
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
    >
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        <EuiText
          size="s"
          css={css`
            font-weight: ${isSelected
              ? euiTheme.font.weight.semiBold
              : euiTheme.font.weight.regular};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {name}
        </EuiText>
      </EuiFlexItem>
      {isSelected && (
        <EuiFlexItem grow={false}>
          {readOnlyContent ?? (
            <EuiButtonIcon
              iconType="cross"
              aria-label={removeAriaLabel}
              disabled={isRemoving}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onRemove();
              }}
            />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
