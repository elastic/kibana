/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSplitPanel } from '@elastic/eui';

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
}

export const FieldGroup = ({ title, children }: FieldGroupProps) => {
  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="s">
        <EuiTitle size="xxs">
          <h3>
            <strong>{title}</strong>
          </h3>
        </EuiTitle>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
