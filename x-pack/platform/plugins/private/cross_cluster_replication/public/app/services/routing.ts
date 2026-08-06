/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/main/wiki/consuming-eui/react-router.md
 */

import type { History } from 'history';
import type { ApplicationStart } from '@kbn/core/public';
import { stringify } from 'query-string';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../common/constants';

export type QueryParamValue = string | number | boolean | null;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[] | undefined>;

const queryParamsFromObject = (
  params: QueryParams | undefined | null,
  encodeParams = false
): string | undefined => {
  if (!params) {
    return;
  }

  const paramsStr = stringify(params, { sort: false, encode: encodeParams });
  return `?${paramsStr}`;
};

export interface CcrReactRouter {
  history: History;
  route: {
    location: History['location'];
  };
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

class Routing {
  #reactRouter: CcrReactRouter | null = null;

  getHrefToRemoteClusters(route = '/', params?: QueryParams | null, encodeParams = false): string {
    const search = queryParamsFromObject(params, encodeParams) || '';
    return this.reactRouterOrThrow.getUrlForApp('management', {
      path: `${BASE_PATH_REMOTE_CLUSTERS}${route}${search}`,
    });
  }

  navigate(route = '/home', params?: QueryParams | null, encodeParams = false): void {
    const search = queryParamsFromObject(params, encodeParams);

    this.reactRouterOrThrow.history.push({
      pathname: encodeURI(route),
      search,
    });
  }

  getAutoFollowPatternPath = (name: string, section = '/edit'): string => {
    return encodeURI(`/auto_follow_patterns${section}/${encodeURIComponent(name)}`);
  };

  getFollowerIndexPath = (name: string, section = '/edit'): string => {
    return encodeURI(`/follower_indices${section}/${encodeURIComponent(name)}`);
  };

  public get reactRouter(): CcrReactRouter | null {
    return this.#reactRouter;
  }

  public set reactRouter(router: CcrReactRouter) {
    this.#reactRouter = router;
  }

  public get reactRouterOrThrow(): CcrReactRouter {
    if (!this.#reactRouter) {
      throw new Error('CCR routing was used before reactRouter was set');
    }
    return this.#reactRouter;
  }
}

export const routing = new Routing();
