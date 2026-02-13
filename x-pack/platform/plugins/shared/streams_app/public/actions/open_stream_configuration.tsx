/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiSkeletonText } from '@elastic/eui';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamMetricsSerializedState } from '../embeddable/types';
import type { StreamConfigurationProps } from './stream_configuration';

export async function openStreamConfiguration(
  coreStart: CoreStart,
  pluginsStart: StreamsAppStartDependencies,
  initialState?: StreamMetricsSerializedState
): Promise<StreamMetricsSerializedState> {
  const { overlays } = coreStart;
  const { streamsRepositoryClient } = pluginsStart.streams;

  const queryClient = new QueryClient();

  return new Promise(async (resolve, reject) => {
    try {
      const LazyStreamConfiguration = lazy(async () => {
        const { StreamConfiguration } = await import('./stream_configuration');
        return {
          default: StreamConfiguration,
        };
      });
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<EuiSkeletonText />}>
              <LazyStreamConfiguration
                initialState={initialState}
                streamsRepositoryClient={
                  streamsRepositoryClient as StreamConfigurationProps['streamsRepositoryClient']
                }
                onCreate={(update: StreamMetricsSerializedState) => {
                  flyoutSession.close();
                  resolve(update);
                }}
                onCancel={() => {
                  flyoutSession.close();
                  reject();
                }}
              />
            </Suspense>
          </QueryClientProvider>,
          coreStart
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
