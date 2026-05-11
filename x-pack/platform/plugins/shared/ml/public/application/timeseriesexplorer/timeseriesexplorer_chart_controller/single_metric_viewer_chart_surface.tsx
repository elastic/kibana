/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';

import { PartitionFieldsRequiredCallout } from './partition_fields_required_callout';

export interface SingleMetricViewerChartSurfaceProps {
  fieldNamesWithEmptyValues: string[];
  /** Controls row, title, forecast modal, etc. */
  controlsSlot?: ReactNode;
  /** Main chart + related blocks */
  children?: ReactNode;
}

/**
 * Thin layout shell for SMV chart hosts: partition gate callout + optional controls + body.
 *
 * Used by `TimeSeriesExplorerEmbeddableChart` (dashboard SMV) and `TimeSeriesExplorer` (full-page SMV) for consistent partition gate + body layout.
 */
export const SingleMetricViewerChartSurface: FC<SingleMetricViewerChartSurfaceProps> = ({
  fieldNamesWithEmptyValues,
  controlsSlot,
  children,
}) => (
  <>
    <PartitionFieldsRequiredCallout fieldNamesWithEmptyValues={fieldNamesWithEmptyValues} />
    {controlsSlot}
    {children}
  </>
);
