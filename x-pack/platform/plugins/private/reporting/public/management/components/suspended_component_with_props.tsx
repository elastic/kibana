/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

export function suspendedComponentWithProps<T = unknown>(
  ComponentToSuspend: React.ComponentType<T>,
  size?: 's' | 'm' | 'l' | 'xl' | 'xxl'
) {
  return (props: T) => (
    <Suspense fallback={<EuiLoadingSpinner size={size ?? 'm'} />}>
      {/* @ts-expect-error upgrade typescript v4.9.5*/}
      <ComponentToSuspend {...props} />
    </Suspense>
  );
}
