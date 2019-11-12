/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { RequestShim } from '../types';

export const createRequestShim = (req: Request): RequestShim => {
  return {
    headers: req.headers,
    payload: req.payload,
    params: req.params,
    getSavedObjectsClient: req.getSavedObjectsClient ? req.getSavedObjectsClient.bind(req) : null,
  };
};
