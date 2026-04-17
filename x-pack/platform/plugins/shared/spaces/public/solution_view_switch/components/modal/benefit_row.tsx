/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';

interface BenefitRowProps {
  iconType: string;
  text: React.ReactNode;
}

export const BenefitRow = ({ iconType, text }: BenefitRowProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiAvatar
            name={`${iconType} icon`}
            type="space"
            iconType={iconType}
            iconSize="m"
            color={euiTheme.colors.backgroundBasePrimary}
            iconColor={euiTheme.colors.primary}
            size="l"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>{text}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
