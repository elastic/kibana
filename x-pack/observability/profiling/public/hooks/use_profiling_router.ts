/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeOf, TypeAsArgs } from '@kbn/typed-react-router-config';
import { useHistory } from 'react-router-dom';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingRouter, profilingRouter, ProfilingRoutes } from '../routing';

export interface StatefulProfilingRouter extends ProfilingRouter {
  push<T extends PathsOf<ProfilingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>
  ): void;
  replace<T extends PathsOf<ProfilingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>
  ): void;
}

export function useProfilingRouter(): StatefulProfilingRouter {
  const history = useHistory();

  const {
    start: { core },
  } = useProfilingDependencies();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return profilingRouter.link(...args);
  };

  return {
    ...profilingRouter,
    push: (...args) => {
      const next = link(...args);

      history.push(next);
    },
    replace: (path, ...args) => {
      const next = link(path, ...args);
      history.replace(next);
    },
    link: (path, ...args) => {
      return core.http.basePath.prepend('/app/profiling' + link(path, ...args));
    },
  };
}
