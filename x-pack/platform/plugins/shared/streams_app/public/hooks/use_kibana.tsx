/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import type { StreamsRepositoryClientOptions } from '@kbn/streams-plugin/public/api';
import type { SignificantEventsRouteRepository } from '@kbn/significant-events-plugin/server';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamsAppServices } from '../services/types';

type MergedRepositoryClient = RouteRepositoryClient<
  StreamsRouteRepository & SignificantEventsRouteRepository,
  StreamsRepositoryClientOptions
>;

export interface StreamsAppKibanaContext {
  appParams: AppMountParameters;
  core: CoreStart;
  dependencies: {
    start: Omit<StreamsAppStartDependencies, 'streams'> & {
      streams: Omit<StreamsAppStartDependencies['streams'], 'streamsRepositoryClient'> & {
        streamsRepositoryClient: MergedRepositoryClient;
      };
    };
  };
  services: StreamsAppServices;
  isServerless: boolean;
}

const useTypedKibana = (): StreamsAppKibanaContext => {
  const context = useKibana<CoreStart & Omit<StreamsAppKibanaContext, 'core'>>();

  return useMemo(() => {
    const { appParams, dependencies, services, isServerless, ...core } = context.services;

    return {
      appParams,
      core,
      dependencies: {
        start: {
          ...dependencies.start,
          streams: {
            ...dependencies.start.streams,
            streamsRepositoryClient: dependencies.start.streams
              .streamsRepositoryClient as unknown as MergedRepositoryClient,
          },
        },
      },
      services,
      isServerless,
    };
  }, [context.services]);
};

export { useTypedKibana as useKibana };
