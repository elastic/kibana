/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { ServerShimWithRouter } from '../../types';

const esErrorsFactory = memoize((server: ServerShimWithRouter) => {
  return (server.plugins.elasticsearch.getCluster('admin') as any).errors;
});

export function isEsErrorFactory(server: ServerShimWithRouter) {
  const esErrors = esErrorsFactory(server);
  return function isEsError(err: Error) {
    return err instanceof esErrors._Abstract;
  };
}
