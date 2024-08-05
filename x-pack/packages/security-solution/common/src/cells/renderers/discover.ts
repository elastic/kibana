/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { ComponentType, PropsWithChildren } from 'react';
import { HostCellWithFlyoutRenderer } from './host';

export type DiscoverCellRenderer = ComponentType<PropsWithChildren<DataGridCellValueElementProps>>;

const RENDERERS: Record<string, DiscoverCellRenderer> = {
  'host.name': HostCellWithFlyoutRenderer,
};

interface GetRendererArgs {
  fieldName: string;
}

export const getDiscoverCellRenderer = ({ fieldName }: GetRendererArgs) => {
  return RENDERERS[fieldName];
};
