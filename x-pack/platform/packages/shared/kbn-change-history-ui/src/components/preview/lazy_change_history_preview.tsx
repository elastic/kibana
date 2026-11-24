/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';

import type { ChangeHistoryPreviewProps } from './change_history_preview';

/** the preview pulls in Monaco, so lazy load is used to prevent package bloat */
const LazyPreview = lazy(async () => {
  const { ChangeHistoryPreview } = await import('./change_history_preview');
  return { default: ChangeHistoryPreview };
});

export const ChangeHistoryPreview = (props: ChangeHistoryPreviewProps): JSX.Element => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <LazyPreview {...props} />
  </Suspense>
);
