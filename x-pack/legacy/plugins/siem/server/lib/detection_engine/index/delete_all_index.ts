/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndicesDeleteParams } from 'elasticsearch';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { CallWithRequest } from './types';

export const deleteAllIndex = async (
  callWithRequest: CallWithRequest<IndicesDeleteParams, CallClusterOptions, boolean>,
  index: string
): Promise<boolean> => {
  return callWithRequest('indices.delete', {
    index,
  });
};
