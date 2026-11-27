/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import type { LinkProps } from '../types';

interface NameCellProps {
  name: string;
  /** Left out shows the name as plain text. */
  linkProps?: LinkProps;
  badge?: { label: string; 'data-test-subj': string };
  isStruckThrough?: boolean;
  'data-test-subj': string;
}

export const NameCell = ({
  name,
  linkProps,
  badge,
  isStruckThrough = false,
  'data-test-subj': dataTestSubj,
}: NameCellProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {linkProps ? (
          <EuiLink
            {...linkProps}
            css={
              isStruckThrough && {
                color: euiTheme.colors.textSubdued,
                textDecoration: 'line-through',
                '&:hover, &:focus': { textDecoration: 'underline line-through' },
              }
            }
            data-test-subj={dataTestSubj}
          >
            {name}
          </EuiLink>
        ) : (
          <EuiText
            size="s"
            color={isStruckThrough ? 'subdued' : undefined}
            css={isStruckThrough && { textDecoration: 'line-through' }}
            data-test-subj={dataTestSubj}
          >
            {name}
          </EuiText>
        )}
      </EuiFlexItem>
      {badge && (
        <EuiFlexItem grow={false}>
          <EuiBadge data-test-subj={badge['data-test-subj']}>{badge.label}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
