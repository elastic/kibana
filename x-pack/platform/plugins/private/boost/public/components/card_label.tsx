/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';

interface CardLabelProps {
  title: string;
  description: ReactNode;
  badge?: ReactNode;
  /** Whether the card is disabled, which dims the description along with the title. */
  isDisabled?: boolean;
}

/**
 * Title and description for a checkable card. Both live in the card label because EUI separates
 * card children from the label with a fixed 16px gap; this keeps them 4px apart.
 */
export const CardLabel = ({ title, description, badge, isDisabled = false }: CardLabelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <strong>{title}</strong>
        </EuiFlexItem>
        {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {/* The card dims a disabled title, but the description's own color would keep it bright. */}
      <EuiText size="xs" color={isDisabled ? euiTheme.colors.disabledText : 'subdued'}>
        {description}
      </EuiText>
    </>
  );
};
