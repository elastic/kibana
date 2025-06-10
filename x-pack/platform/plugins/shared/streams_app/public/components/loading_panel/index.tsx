/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React from 'react';

export function LoadingPanel({
  loading = true,
  size,
  className,
}: {
  loading?: boolean;
  size?: React.ComponentProps<typeof EuiLoadingSpinner>['size'];
  className?: string;
}) {
  if (!loading) {
    return null;
  }

  return (
    <EuiFlexGroup
      className={className}
      alignItems="center"
      justifyContent="center"
      gutterSize="none"
    >
      <EuiSpacer size="xl" />
      <EuiLoadingSpinner size={size} />
      <EuiSpacer size="xl" />
    </EuiFlexGroup>
  );
}
