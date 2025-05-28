/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { css } from '@emotion/css';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';

export function ChatBanner({
  title,
  description,
  button = null,
  icon = 'users',
}: {
  title: string;
  description: string;
  button?: ReactNode;
  icon?: string;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      color="subdued"
      borderRadius="m"
      grow={false}
      className={css`
        margin: ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon size="l" type={icon} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="xs">
            <h3>{title}</h3>
            <p>{description}</p>
            {button}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
