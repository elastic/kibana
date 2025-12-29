/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { StreamsAppRouter, StreamsAppRoutes } from '../routes/config';
import { streamsAppRouter } from '../routes/config';
import { useKibana } from './use_kibana';

export interface StatefulStreamsAppRouter extends StreamsAppRouter {
  push<T extends PathsOf<StreamsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>
  ): void;
  replace<T extends PathsOf<StreamsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>
  ): void;
}

export function useStreamsAppRouter(): StatefulStreamsAppRouter {
  const {
    core: { http },
  } = useKibana();
  const history = useHistory();

  const getRouterPath = (...args: any[]) => {
    // @ts-expect-error
    return streamsAppRouter.link(...args);
  };

  return useMemo<StatefulStreamsAppRouter>(
    () => ({
      ...streamsAppRouter,
      // Use history.push/replace to preserve search params (_g) during within-app navigation
      push: (...args) => {
        const path = getRouterPath(...args);
        history.push({ pathname: path, search: history.location.search });
      },
      replace: (path, ...args) => {
        const nextPath = getRouterPath(path, ...args);
        history.replace({ pathname: nextPath, search: history.location.search });
      },
      link: (path, ...args) => {
        const routerPath = getRouterPath(path, ...args);
        const search = history.location.search || '';
        return http.basePath.prepend(`/app/streams${routerPath}${search}`);
      },
    }),
    [history, http.basePath]
  );
}
