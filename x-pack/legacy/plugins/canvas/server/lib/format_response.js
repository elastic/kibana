/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import boom from 'boom';

export const formatResponse = esErrors => resp => {
  if (resp.isBoom) {
    return resp;
  } // can't wrap it if it's already a boom error

  if (resp instanceof esErrors['400']) {
    return boom.badRequest(resp);
  }

  if (resp instanceof esErrors['401']) {
    return boom.unauthorized();
  }

  if (resp instanceof esErrors['403']) {
    return boom.forbidden("Sorry, you don't have access to that");
  }

  if (resp instanceof esErrors['404']) {
    return boom.boomify(resp, { statusCode: 404 });
  }

  return resp;
};
