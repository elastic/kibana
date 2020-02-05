/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/master/wiki/react-router.md
 */

import { createLocation } from 'history';

let _userHasLeftApp = false;

export function setUserHasLeftApp(userHasLeftApp) {
  _userHasLeftApp = userHasLeftApp;
}

export function getUserHasLeftApp() {
  return _userHasLeftApp;
}

const isModifiedEvent = event =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = event => event.button === 0;

let router;
export function registerRouter(reactRouter) {
  router = reactRouter;
}

export function getRouter() {
  return router;
}

/**
 * The logic for generating hrefs and onClick handlers from the `to` prop is largely borrowed from
 * https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/Link.js.
 */
export function getRouterLinkProps(to) {
  const location =
    typeof to === 'string' ? createLocation(to, null, null, router.history.location) : to;

  const href = router.history.createHref(location);

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
    router.history.push(location);
  };

  return { href, onClick };
}
