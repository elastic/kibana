/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../types';

export const transformError = (err: Error & { statusCode?: number }) => {
  if (Boom.isBoom(err)) {
    return err;
  } else {
    if (err.statusCode != null) {
      return new Boom(err.message, { statusCode: err.statusCode });
    } else if (err instanceof TypeError) {
      // allows us to throw type errors instead of booms in some conditions
      // where we don't want to mingle Boom with the rest of the code
      return new Boom(err.message, { statusCode: 400 });
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return err;
    }
  }
};

export interface BulkError {
  id: string;
  error: {
    statusCode: number;
    message: string;
  };
}
export const createBulkErrorObject = ({
  ruleId,
  statusCode,
  message,
}: {
  ruleId: string;
  statusCode: number;
  message: string;
}): BulkError => {
  return {
    id: ruleId,
    error: {
      statusCode,
      message,
    },
  };
};

export const transformBulkError = (
  ruleId: string,
  err: Error & { statusCode?: number }
): BulkError => {
  if (Boom.isBoom(err)) {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.output.statusCode,
      message: err.message,
    });
  } else if (err instanceof TypeError) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 400,
      message: err.message,
    });
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.statusCode ?? 500,
      message: err.message,
    });
  }
};

export const getIndex = (request: RequestFacade, server: ServerFacade): string => {
  const spaceId = server.plugins.spaces.getSpaceId(request);
  const signalsIndex = server.config().get(`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`);
  return `${signalsIndex}-${spaceId}`;
};

export const callWithRequestFactory = (request: RequestFacade, server: ServerFacade) => {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  return <T, U>(endpoint: string, params: T, options?: U) => {
    return callWithRequest(request, endpoint, params, options);
  };
};
