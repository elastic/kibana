/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getRulesCountLabel } from '../translations';

export interface RuleHealthBreakdownItem {
  key: string;
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}

export interface RuleHealthBreakdownListProps {
  title: string;
  color: 'danger' | 'warning';
  items: RuleHealthBreakdownItem[];
  emptyMessage: string;
  'data-test-subj'?: string;
}

/** A panel listing buckets as clickable rows with a proportional bar. */
export const RuleHealthBreakdownList = ({
  title,
  color,
  items,
  emptyMessage,
  'data-test-subj': dataTestSubj,
}: RuleHealthBreakdownListProps) => {
  const max = items.reduce((acc, { count }) => Math.max(acc, count), 0);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      {items.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj={`${dataTestSubj}-empty`}>
          <p>{emptyMessage}</p>
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {items.map(({ key, label, count, isSelected, onClick }) => (
            <EuiFlexItem key={key} grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="both"
                color={isSelected ? color : 'text'}
                onClick={onClick}
                data-test-subj={`${dataTestSubj}-${key}`}
                aria-pressed={isSelected}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="spaceBetween"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {getRulesCountLabel(count)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiButtonEmpty>
              <EuiProgress value={count} max={max || 1} color={color} size="s" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
