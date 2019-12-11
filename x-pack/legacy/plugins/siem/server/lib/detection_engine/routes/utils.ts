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
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return err;
    }
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
