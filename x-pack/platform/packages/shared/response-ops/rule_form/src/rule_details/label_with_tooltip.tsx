/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

export function LabelWithTooltip({
  labelContent,
  tooltipContent,
}: {
  labelContent: string;
  tooltipContent: string;
}) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{labelContent}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip type="question" content={tooltipContent} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
