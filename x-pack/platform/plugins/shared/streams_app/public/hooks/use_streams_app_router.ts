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

  return useMemo<StatefulStreamsAppRouter>(
    () => ({
      ...streamsAppRouter,
      push: (...args) => {
        // @ts-expect-error
        const path = streamsAppRouter.link(...args);
        history?.push(path);
      },
      replace: (...args) => {
        // @ts-expect-error
        const path = streamsAppRouter.link(...args);
        history?.replace(path);
      },
      link: (...args) => {
        const path = streamsAppRouter.link(...args);
        return http.basePath.prepend(`/app/streams${path}`);
      },
    }),
    [history, http.basePath]
  );
}
