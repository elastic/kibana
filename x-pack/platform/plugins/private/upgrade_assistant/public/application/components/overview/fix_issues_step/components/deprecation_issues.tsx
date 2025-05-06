/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';

interface Props {
  type: string;
  color: string;
  iconType: string;
  message: React.ReactNode;
}
export const DeprecationIssue = (props: Props) => {
  const { type, color, iconType, message } = props;

  return (
    <EuiFlexItem data-test-subj={`${type}Deprecations`}>
      <EuiText color={color}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} alignItems="center">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {message}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </EuiFlexItem>
  );
};
