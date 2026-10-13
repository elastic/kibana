/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import type { EvidenceViewProps } from './evidence_view';

const EvidenceViewLazy = React.lazy(() =>
  import('./evidence_view').then(({ EvidenceView }) => ({ default: EvidenceView }))
);

/**
 * {@link EvidenceView} loaded on first render, so charts stay out of the page load bundle of
 * every consumer that only registers renderers.
 */
export const LazyEvidenceView: React.FC<EvidenceViewProps> = (props) => (
  <Suspense fallback={<EuiLoadingChart size="m" />}>
    <EvidenceViewLazy {...props} />
  </Suspense>
);
