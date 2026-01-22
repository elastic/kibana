/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { IconType } from '@elastic/eui';
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
 * Gets the icon type (component or string) for a Catalog.
 * This is useful for passing to EuiIcon's `type` prop or flyout headers.
 *
 * @param iconType - The icon type (e.g., '.github', '.notion')
 * @returns IconType (component or string) that can be used with EuiIcon
 */
export function getConnectorIconType(iconType: string): IconType {
  return ConnectorIconsMap.get(iconType) ?? 'integration';
}

/**
 * Utility function to get the appropriate icon JSX element for a Catalog.
 *
 * @param iconType - The icon type (e.g., '.github', '.notion')
 * @param size - Icon size (default: 'l')
 * @returns JSX element representing the icon
 */
export function getConnectorIcon(iconType: string, size: IconSize = 'l'): JSX.Element {
  const iconTypeOrComponent = getConnectorIconType(iconType);

  // If it's a lazy-loaded component (not a string), render it directly with Suspense
  if (typeof iconTypeOrComponent !== 'string') {
    const skeletonSize = iconToSkeletonSizeMap[size];
    const IconComponent = iconTypeOrComponent as React.ComponentType<{ size?: IconSize }>;
    return (
      <Suspense fallback={<EuiSkeletonCircle size={skeletonSize} />}>
        <IconComponent size={size} />
      </Suspense>
    );
  }

  // Otherwise, it's a string icon name, render directly
  return <EuiIcon type={iconTypeOrComponent} size={size} />;
}
