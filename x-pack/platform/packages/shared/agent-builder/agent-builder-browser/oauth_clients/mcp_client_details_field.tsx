/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

const fieldValueStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-family: ${euiTheme.font.familyCode};
  word-break: break-all;
  color: ${euiTheme.colors.accentSecondary};
`;

export interface McpClientDetailsFieldProps {
  label: ReactNode;
  actions?: ReactNode[];
  append?: ReactNode;
}

export const McpClientDetailsField = ({
  label,
  actions,
  append,
  children,
}: PropsWithChildren<McpClientDetailsFieldProps>) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiText size="xs">{label}</EuiText>
      <EuiPanel color="subdued" hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={true}>
            <div css={fieldValueStyles}>{children}</div>
          </EuiFlexItem>
          {actions && actions.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                {actions.map((action, index) => (
                  <EuiFlexItem key={index} grow={false}>
                    {action}
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {append && (
          <>
            <EuiSpacer size="s" />
            {append}
          </>
        )}
      </EuiPanel>
    </EuiFlexGroup>
  );
};
