/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Legacy } from 'kibana';
import { ResponseObject } from 'hapi';
import { canRedirectRequest } from './can_redirect_request';

export function initOnPreResponseHandler(server: Legacy.Server) {
  server.ext('onPreResponse', async (request: Legacy.Request, h: Legacy.ResponseToolkit) => {
    const statusCode = getStatusCode(request.response);
    const isForbidden = statusCode === 403;
    const isNotFound = statusCode === 404;

    const canRedirect = canRedirectRequest(request);

    if ((isForbidden || isNotFound) && canRedirect) {
      const app = server.getHiddenUiAppById('unavailable');
      return (await h.renderAppWithDefaultConfig(app)).takeover();
    }

    return h.continue;
  });

  function getStatusCode(response: ResponseObject | Boom<any> | null): number | null {
    if (!response) {
      return null;
    }

    if (Boom.isBoom(response as any)) {
      return (response as Boom<any>).output.statusCode;
    }

    return (response as ResponseObject).statusCode;
  }
}
