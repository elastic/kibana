/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

interface EisTableDateCellProps {
  formattedDate: string | undefined;
}

export const EisTableDateCell = ({ formattedDate }: EisTableDateCellProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon
        type="calendar"
        size="m"
        aria-hidden={true}
        css={formattedDate ? undefined : { visibility: 'hidden' }}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{formattedDate ?? '--'}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
