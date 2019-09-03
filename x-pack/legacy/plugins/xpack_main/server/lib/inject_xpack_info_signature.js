/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function injectXPackInfoSignature(info, request, h) {
  // If we're returning an error response, refresh xpack info from
  // Elasticsearch in case the error is due to a change in license information
  // in Elasticsearch.
  const isErrorResponse = request.response instanceof Error;
  if (isErrorResponse) {
    await info.refreshNow();
  }

  if (info.isAvailable()) {
    // Note: request.response.output is used instead of request.response because
    // evidently HAPI does not allow headers to be set on the latter in case of
    // error responses.
    const response = isErrorResponse ? request.response.output : request.response;
    response.headers['kbn-xpack-sig'] = info.getSignature();
  }

  return h.continue;
}
