/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';

interface ListItemFieldTextProps {
  label: string;
  testSubj: string;
  children: React.ReactNode;
}

export const ListItemFieldText: React.FC<ListItemFieldTextProps> = ({
  label,
  testSubj,
  children,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      label: css`
        font-weight: ${euiTheme.font.weight.semiBold};
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        data-test-subj={testSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <span css={styles.label}>
              {label}
              {': '}
            </span>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {children}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

ListItemFieldText.displayName = 'ListItemFieldText';
