/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { ObservabilityAIAssistantRouter, ObservabilityAIAssistantRoutes } from '../routes/config';
import { observabilityAIAssistantRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulObservabilityAIAssistantRouter extends ObservabilityAIAssistantRouter {
  push<T extends PathsOf<ObservabilityAIAssistantRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ObservabilityAIAssistantRoutes, T>>
  ): void;
  replace<T extends PathsOf<ObservabilityAIAssistantRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ObservabilityAIAssistantRoutes, T>>
  ): void;
}

export function useObservabilityAIAssistantRouter(): StatefulObservabilityAIAssistantRouter {
  const {
    services: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return observabilityAIAssistantRouter.link(...args);
  };

  return useMemo<StatefulObservabilityAIAssistantRouter>(
    () => ({
      ...observabilityAIAssistantRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('observabilityAIAssistant', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('observabilityAIAssistant', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/observabilityAIAssistant' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
