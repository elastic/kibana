/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

const extractCausedByChain = (causedBy: any = {}, accumulator: any[] = []): any => {
  const { reason, caused_by } = causedBy;

  if (reason) {
    accumulator.push(reason);
  }

  if (caused_by) {
    return extractCausedByChain(caused_by, accumulator);
  }

  return accumulator;
};

// A proxy in front of ES can answer with a non-JSON body (e.g. an HTML error page); treat it as an empty body
// so the wrapper still returns a response instead of throwing.
const parseEsBody = (esBody: unknown): Partial<estypes.ErrorResponseBase> => {
  if (typeof esBody !== 'string') {
    return typeof esBody === 'object' && esBody !== null ? esBody : {};
  }

  try {
    const parsed: unknown = JSON.parse(esBody);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
};

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 * @return Object Boom error response
 */
export const wrapEsError = (err: any, statusCodeToMessageMap: any = {}) => {
  const { statusCode, response } = err;
  // Errors thrown by the ES client carry the ES response body under `meta.body`, not `response`
  const esBody = response ?? err.meta?.body ?? {};

  const { error: { root_cause = [], caused_by = {} } = {} } = parseEsBody(esBody);

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response, include the additional information from ES, and return it
  if (!statusCodeToMessageMap[statusCode]) {
    // const boomError = Boom.boomify(err, { statusCode });
    const error: any = { statusCode };

    // The caused_by chain has the most information so use that if it's available. If not then
    // settle for the root_cause.
    const causedByChain = extractCausedByChain(caused_by);
    const defaultCause = root_cause.length ? extractCausedByChain(root_cause[0]) : err.message;

    error.cause = causedByChain.length ? causedByChain : defaultCause;
    return error;
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return { message, statusCode };
};
