/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndicesExistsParams } from 'elasticsearch';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { CallWithRequest } from '../types';

export const getIndexExists = async (
  callWithRequest: CallWithRequest<IndicesExistsParams, CallClusterOptions, boolean>,
  index: string
): Promise<boolean> => {
  return callWithRequest('indices.exists', {
    index,
  });
};
