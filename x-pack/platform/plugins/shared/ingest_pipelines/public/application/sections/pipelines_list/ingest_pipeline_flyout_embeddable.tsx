/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import React, { Suspense, ComponentType } from 'react';
import { IngestPipelineFlyoutWithContextProps } from './ingest_pipeline_flyout_with_context_types';

const IngestPipelineFlyoutWithContext = dynamic<
  ComponentType<IngestPipelineFlyoutWithContextProps>
>(() =>
  import('./ingest_pipeline_flyout_with_context').then((mod) => ({
    default: mod.IngestPipelineFlyoutWithContext,
  }))
);

export const IngestPipelineFlyout: React.FC<IngestPipelineFlyoutWithContextProps> = (props) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <IngestPipelineFlyoutWithContext {...props} />
    </Suspense>
  );
};
