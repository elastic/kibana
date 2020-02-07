/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { RequestShim } from '../types';

export const createRequestShim = (req: KibanaRequest): RequestShim => {
  return {
    headers: req.headers as Record<string, string>,
    payload: req.body || (req as any).payload,
    params: req.params,
  };
};
