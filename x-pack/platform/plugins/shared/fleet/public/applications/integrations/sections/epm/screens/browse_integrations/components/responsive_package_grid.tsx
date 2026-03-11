/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsWithinMaxBreakpoint } from '@elastic/eui';

import { GridColumn } from '../../../components/package_list_grid/grid';
import type { IntegrationCardItem } from '../../home';

export interface PackageGridProps {
  items: IntegrationCardItem[];
  isLoading: boolean;
}

export const ResponsivePackageGrid: React.FC<PackageGridProps> = ({ items, isLoading }) => {
  const isWithinLargeBreakpoint = useIsWithinMaxBreakpoint('l');
  const isWithinSmallBreakpoint = useIsWithinMaxBreakpoint('s');

  const columnCount = isWithinSmallBreakpoint ? 1 : isWithinLargeBreakpoint ? 2 : 3;
  return <GridColumn list={items} isLoading={isLoading} columnCount={columnCount} gutterSize="s" />;
};
