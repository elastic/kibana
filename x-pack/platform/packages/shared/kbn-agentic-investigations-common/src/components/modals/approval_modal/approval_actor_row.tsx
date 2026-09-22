/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiIcon, EuiText } from '@elastic/eui';

export const ApprovalActorRow = memo(() => {
  // TODO fetch user profile and use that info here
  const { name, detail } = { name: 'You', detail: 'Senior Analyst' };

  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="radar" color="subdued" size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>{name}</strong>
            {' — '}
            {detail}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

ApprovalActorRow.displayName = 'ApprovalActorRow';
