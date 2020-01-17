/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as H from 'history';
import { isEqual } from 'lodash/fp';
import { memo, useEffect, useState } from 'react';
import { withRouter } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';

import { SpyRouteProps } from './types';
import { useRouteSpy } from './use_route_spy';

export const SpyRouteComponent = memo<SpyRouteProps & { location: H.Location }>(
  ({
    location: { pathname, search },
    history,
    match: {
      params: { pageName, detailName, tabName, flowTarget },
    },
    state,
  }) => {
    const [isInitializing, setIsInitializing] = useState(true);
    const [route, dispatch] = useRouteSpy();

    useEffect(() => {
      if (isInitializing && search !== '') {
        dispatch({
          type: 'updateSearch',
          search,
        });
        setIsInitializing(false);
      }
    }, [search]);
    useEffect(() => {
      if (pageName && !isEqual(route.pathName, pathname)) {
        if (isInitializing && detailName == null) {
          dispatch({
            type: 'updateRouteWithOutSearch',
            route: {
              pageName,
              detailName,
              tabName,
              pathName: pathname,
              history,
              flowTarget,
            },
          });
          setIsInitializing(false);
        } else {
          dispatch({
            type: 'updateRoute',
            route: {
              pageName,
              detailName,
              tabName,
              search,
              pathName: pathname,
              history,
              flowTarget,
            },
          });
        }
      } else {
        if (pageName && !deepEqual(state, route.state)) {
          dispatch({
            type: 'updateRoute',
            route: {
              pageName,
              detailName,
              tabName,
              search,
              pathName: pathname,
              history,
              flowTarget,
              state,
            },
          });
        }
      }
    }, [pathname, search, pageName, detailName, tabName, flowTarget, state]);
    return null;
  }
);

export const SpyRoute = withRouter(SpyRouteComponent);
