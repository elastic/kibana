/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, type FC } from 'react';

import type { AnomalyJobSelectorProps } from './anomaly_job_selector';

const AnomalyJobSelector = React.lazy(() => import('./anomaly_job_selector'));

export const AnomalyJobSelectorLazy: FC<AnomalyJobSelectorProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <AnomalyJobSelector {...props} />
    </Suspense>
  );
};
