/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export function AlertingEpisodeTags({
  tags,
  color,
  size = 3,
  oneLine = false,
}: {
  tags?: string[] | null;
  color?: string;
  size?: number;
  oneLine?: boolean;
}) {
  if (!tags?.length) {
    return <EuiText size="s">-</EuiText>;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap={!oneLine}
      responsive={false}
      alignItems="center"
      direction="row"
    >
      {tags.slice(0, size).map((tag, index) => (
        <EuiFlexItem key={`${tag}-${index}`} grow={false}>
          <EuiBadge color={color}>{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
