/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { DataStreamResponse } from '../../../../../../common';
import { STATUS_COLOR_MAP, STATUS_ICON_MAP, STATUS_TEXT_MAP } from './constants';

interface StatusProps {
  status: DataStreamResponse['status'];
  isDeleting?: boolean;
}

export const Status = ({ status, isDeleting = false }: StatusProps) => {
  const isSpinnerShown = isDeleting || status === 'pending' || status === 'processing';
  const displayText = isDeleting ? 'Deleting...' : STATUS_TEXT_MAP[status];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        {isSpinnerShown ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiIcon type={STATUS_ICON_MAP[status]} color={STATUS_COLOR_MAP[status]} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{displayText}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

Status.displayName = 'Status';
