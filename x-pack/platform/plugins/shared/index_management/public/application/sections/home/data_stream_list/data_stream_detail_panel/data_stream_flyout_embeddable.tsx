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
import { DataStreamFlyoutWithContextProps } from './data_stream_flyout_with_context_types';

const DataStreamFlyoutWithContext = dynamic<ComponentType<DataStreamFlyoutWithContextProps>>(() =>
  import('./data_stream_flyout_with_context').then((mod) => ({
    default: mod.DataStreamFlyoutWithContext,
  }))
);

export const DataStreamFlyout: React.FC<DataStreamFlyoutWithContextProps> = (props) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <DataStreamFlyoutWithContext {...props} />
    </Suspense>
  );
};
