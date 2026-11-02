/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamsAppServices } from '../services/types';

export interface StreamsAppKibanaContext {
  appParams: AppMountParameters;
  core: CoreStart;
  dependencies: {
    start: StreamsAppStartDependencies;
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
      dependencies,
      services,
      isServerless,
    };
  }, [context.services]);
};

export { useTypedKibana as useKibana };
