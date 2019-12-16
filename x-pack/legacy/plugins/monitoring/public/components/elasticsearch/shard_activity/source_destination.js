/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiLink, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { SourceTooltip } from './source_tooltip';

export const SourceDestination = props => {
  const { sourceName, targetName, targetTransportAddress } = props;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem grow={false}>
        <SourceTooltip {...props}>{sourceName}</SourceTooltip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="arrowRight" size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={targetTransportAddress} position="bottom">
          <EuiLink>{targetName}</EuiLink>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
