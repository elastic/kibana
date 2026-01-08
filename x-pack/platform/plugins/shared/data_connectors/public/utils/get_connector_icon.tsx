/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import type { IconSize } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { Connector } from '../types/connector';

/**
 * Utility function to get the appropriate icon for a connector.
 *
 * @param connector - The connector object from Data Sources Registry
 * @param size - Icon size (default: 'l')
 * @param fallbackIcon - Fallback EUI icon name (default: 'application')
 * @returns JSX element representing the icon
 */
export function getConnectorIcon(
  connector: Connector,
  size: IconSize = 'l',
  fallbackIcon: string = 'application'
): JSX.Element {
  // Try connector-specs lazy-loaded icon (type starts with '.')
  if (connector.type?.startsWith('.')) {
    const LazyIcon = ConnectorIconsMap.get(connector.type);
    if (LazyIcon) {
      // EuiLoadingSpinner doesn't support "original" size, so we use "m" as fallback
      const spinnerSize = size === 'original' ? 'm' : size;
      return (
        <Suspense fallback={<EuiLoadingSpinner size={spinnerSize} />}>
          <LazyIcon size={size} />
        </Suspense>
      );
    }
  }

  // Fallback: Default icon
  return <EuiIcon type={fallbackIcon} size={size} />;
}
