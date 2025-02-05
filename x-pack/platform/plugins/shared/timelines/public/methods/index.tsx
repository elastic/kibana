/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { LastUpdatedAtProps } from '../components';

const LastUpdatedLazy = lazy(() => import('../components/last_updated'));
export const getLastUpdatedLazy = (props: LastUpdatedAtProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LastUpdatedLazy {...props} />
    </Suspense>
  );
};
