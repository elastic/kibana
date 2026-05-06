/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

interface Props {
  items: string[];
}

export const BadgeList = ({ items }: Props) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
    {items.map((item) => (
      <EuiFlexItem grow={false} key={item}>
        <EuiBadge color="hollow">{item}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
