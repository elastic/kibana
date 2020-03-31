/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { kibanaResponseFactory } from '../../../../../../../../../src/core/server';

export const callRoute = (
  route: RequestHandler<any, any, any>,
  ctx = {},
  request = {},
  response = kibanaResponseFactory
) => {
  return route(ctx as any, request as any, response);
};

export const createRouter = (indexToActionMap: Record<number, string>) => {
  let index = 0;
  const routeHandlers: Record<string, RequestHandler<any, any, any>> = {};
  const addHandler = (ignoreCtxForNow: any, handler: RequestHandler) => {
    // Save handler and increment index
    routeHandlers[indexToActionMap[index]] = handler;
    index++;
  };

  return {
    getRoutes: () => routeHandlers,
    router: {
      get: addHandler,
      post: addHandler,
      put: addHandler,
      delete: addHandler,
    },
  };
};
