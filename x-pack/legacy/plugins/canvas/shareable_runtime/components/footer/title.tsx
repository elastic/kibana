/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

interface Props {
  /**
   * The title of the workpad being shared.
   */
  title: string;
}
/**
 * The title of the workpad displayed in the left-hand of the footer.
 */
export const Title = ({ title }: Props) => (
  <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoKibana" size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false} style={{ minWidth: 0, cursor: 'default' }}>
      <EuiText color="ghost" size="s">
        <div className="eui-textTruncate">{title}</div>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
