/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export const FieldsStatsGrid = withSuspense(
  React.lazy(() =>
    import('./fields_stats_grid').then(({ FieldsStatsGrid: FieldsStatsGridComponent }) => ({
      default: FieldsStatsGridComponent,
    }))
  )
);

export function getFieldsStatsGrid() {
  // TODO this function should take in Kibana services
  // then wrap in <KibanaContextProvider services={{ ...services }}>
  return FieldsStatsGrid;
}
