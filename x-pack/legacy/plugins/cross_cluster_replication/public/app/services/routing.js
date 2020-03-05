/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/master/wiki/react-router.md
 */

import { createLocation } from 'history';
import { stringify } from 'query-string';
import { APPS, BASE_PATH, BASE_PATH_REMOTE_CLUSTERS } from '../../../common/constants';

const isModifiedEvent = event =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = event => event.button === 0;

const queryParamsFromObject = (params, encodeParams = false) => {
  if (!params) {
    return;
  }

  const paramsStr = stringify(params, { sort: false, encode: encodeParams });
  return `?${paramsStr}`;
};

const appToBasePathMap = {
  [APPS.CCR_APP]: BASE_PATH,
  [APPS.REMOTE_CLUSTER_APP]: BASE_PATH_REMOTE_CLUSTERS,
};

class Routing {
  _userHasLeftApp = false;
  _reactRouter = null;

  /**
   * The logic for generating hrefs and onClick handlers from the `to` prop is largely borrowed from
   * https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/Link.js.
   *
   * @param {*} to URL to navigate to
   */
  getRouterLinkProps(to, base = BASE_PATH, params = {}, encodeParams = false) {
    const search = queryParamsFromObject(params, encodeParams) || '';
    const location =
      typeof to === 'string'
        ? createLocation(base + to + search, null, null, this._reactRouter.history.location)
        : to;
    const href = this._reactRouter.history.createHref(location);

    const onClick = event => {
      if (event.defaultPrevented) {
        return;
      }

      // If target prop is set (e.g. to "_blank"), let browser handle link.
      if (event.target.getAttribute('target')) {
        return;
      }

      if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
        return;
      }

      // Prevent regular link behavior, which causes a browser refresh.
      event.preventDefault();
      this._reactRouter.history.push(location);
    };

    return { href, onClick };
  }

  navigate(route = '/home', app = APPS.CCR_APP, params, encodeParams = false) {
    const search = queryParamsFromObject(params, encodeParams);

    this._reactRouter.history.push({
      pathname: encodeURI(appToBasePathMap[app] + route),
      search,
    });
  }

  getAutoFollowPatternPath = (name, section = '/edit') => {
    return encodeURI(`#${BASE_PATH}/auto_follow_patterns${section}/${encodeURIComponent(name)}`);
  };

  getFollowerIndexPath = (name, section = '/edit', withBase = true) => {
    return withBase
      ? encodeURI(`#${BASE_PATH}/follower_indices${section}/${encodeURIComponent(name)}`)
      : encodeURI(`/follower_indices${section}/${encodeURIComponent(name)}`);
  };

  get reactRouter() {
    return this._reactRouter;
  }

  set reactRouter(router) {
    this._reactRouter = router;
  }

  get userHasLeftApp() {
    return this._userHasLeftApp;
  }

  set userHasLeftApp(hasLeft) {
    this._userHasLeftApp = hasLeft;
  }
}

export default new Routing();
