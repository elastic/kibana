/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/main/wiki/consuming-eui/react-router.md
 */

import { stringify } from 'query-string';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../common/constants';

const queryParamsFromObject = (params, encodeParams = false) => {
  if (!params) {
    return;
  }

  const paramsStr = stringify(params, { sort: false, encode: encodeParams });
  return `?${paramsStr}`;
};

class Routing {
  _reactRouter = null;

  getHrefToRemoteClusters(route = '/', params, encodeParams = false) {
    const search = queryParamsFromObject(params, encodeParams) || '';
    return this._reactRouter.getUrlForApp('management', {
      path: `${BASE_PATH_REMOTE_CLUSTERS}${route}${search}`,
    });
  }

  navigate(route = '/home', params, encodeParams = false) {
    const search = queryParamsFromObject(params, encodeParams);

    this._reactRouter.history.push({
      pathname: encodeURI(route),
      search,
    });
  }

  getAutoFollowPatternPath = (name, section = '/edit') => {
    return encodeURI(`/auto_follow_patterns${section}/${encodeURIComponent(name)}`);
  };

  getFollowerIndexPath = (name, section = '/edit') => {
    return encodeURI(`/follower_indices${section}/${encodeURIComponent(name)}`);
  };

  get reactRouter() {
    return this._reactRouter;
  }

  set reactRouter(router) {
    this._reactRouter = router;
  }
}

export const routing = new Routing();
