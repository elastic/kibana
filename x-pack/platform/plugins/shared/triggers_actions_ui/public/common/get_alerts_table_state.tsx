/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Ref, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { typedForwardRef } from '../../common/utils';
import {
  AdditionalContext,
  AlertsTableImperativeApi,
  AlertsTableProps,
  LazyLoadProps,
} from '../types';
import { type AlertsTable } from '../application/sections/alerts_table/alerts_table';

const AlertsTableStateLazy = lazy(
  () => import('../application/sections/alerts_table/alerts_table')
) as typeof AlertsTable;

export const getAlertsTableStateLazy = typedForwardRef(
  <AC extends AdditionalContext>(
    { hideLazyLoader, ...props }: AlertsTableProps<AC> & LazyLoadProps,
    ref: Ref<AlertsTableImperativeApi>
  ) => (
    <Suspense fallback={hideLazyLoader ? null : <EuiLoadingSpinner />}>
      <AlertsTableStateLazy ref={ref} {...props} />
    </Suspense>
  )
);
