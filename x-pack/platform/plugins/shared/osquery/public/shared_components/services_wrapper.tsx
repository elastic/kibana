/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '../common/lib/kibana';
import { ExperimentalFeaturesProvider } from '../common/experimental_features_context';

import { queryClient } from '../query_client';
import { KibanaRenderContextProvider } from '../shared_imports';
import type { StartPlugins } from '../types';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { allowedExperimentalValues } from '../../common/experimental_features';

const DEFAULT_EXPERIMENTAL_FEATURES: ExperimentalFeatures = allowedExperimentalValues;

export interface ServicesWrapperProps {
  services: CoreStart & StartPlugins;
  children: React.ReactNode;
  experimentalFeatures?: ExperimentalFeatures;
}

const ServicesWrapperComponent: React.FC<ServicesWrapperProps> = ({
  services,
  children,
  experimentalFeatures = DEFAULT_EXPERIMENTAL_FEATURES,
}) => (
  <KibanaRenderContextProvider {...services}>
    <KibanaContextProvider services={services}>
      <ExperimentalFeaturesProvider value={experimentalFeatures}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ExperimentalFeaturesProvider>
    </KibanaContextProvider>
  </KibanaRenderContextProvider>
);

const ServicesWrapper = React.memo(ServicesWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { ServicesWrapper as default };
