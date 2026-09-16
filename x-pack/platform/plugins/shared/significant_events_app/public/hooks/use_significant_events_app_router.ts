/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { SignificantEventsAppRouter, SignificantEventsAppRoutes } from '../routes/config';
import { significantEventsAppRouter } from '../routes/config';
import { useKibana } from './use_kibana';

export interface StatefulSignificantEventsAppRouter extends SignificantEventsAppRouter {
  push<T extends PathsOf<SignificantEventsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<SignificantEventsAppRoutes, T>>
  ): void;
  replace<T extends PathsOf<SignificantEventsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<SignificantEventsAppRoutes, T>>
  ): void;
}

export function useSignificantEventsAppRouter(): StatefulSignificantEventsAppRouter {
  const {
    core: { application },
  } = useKibana();
  const history = useHistory();

  return useMemo<StatefulSignificantEventsAppRouter>(
    () => ({
      ...significantEventsAppRouter,
      push: (...args) => {
        // @ts-expect-error
        const path = significantEventsAppRouter.link(...args);
        history?.push(path);
      },
      replace: (...args) => {
        // @ts-expect-error
        const path = significantEventsAppRouter.link(...args);
        history?.replace(path);
      },
      link: (...args) => {
        const path = significantEventsAppRouter.link(...args);
        // Resolves the registered appRoute + basePath from the app id.
        return application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, { path });
      },
    }),
    [history, application]
  );
}
