/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiIcon, EuiSkeletonCircle } from '@elastic/eui';
import type { IconSize } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';

// Map IconSize to EuiSkeletonCircle size (only supports s, m, l, xl)
const iconToSkeletonSizeMap: Record<IconSize, 's' | 'm' | 'l' | 'xl'> = {
  s: 's',
  m: 'm',
  l: 'l',
  xl: 'xl',
  xxl: 'xl', // xxl not supported, fallback to xl
  original: 'm', // original not supported, fallback to m
};

/**
 * Utility function to get the appropriate icon for a connector.
 *
 * @param iconType - The icon type (e.g., '.github', '.notion')
 * @param size - Icon size (default: 'l')
 * @returns JSX element representing the icon
 */
export function getConnectorIcon(iconType: string, size: IconSize = 'l'): JSX.Element {
  const LazyIcon = ConnectorIconsMap.get(iconType);
  if (LazyIcon) {
    const skeletonSize = iconToSkeletonSizeMap[size];
    return (
      <Suspense fallback={<EuiSkeletonCircle size={skeletonSize} />}>
        <LazyIcon size={size} />
      </Suspense>
    );
  }

  // Fallback: Default icon if not found in map
  return <EuiIcon type="integration" size={size} />;
}
