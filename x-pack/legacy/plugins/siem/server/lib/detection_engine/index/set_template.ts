/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndicesPutTemplateParams } from 'elasticsearch';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { CallWithRequest } from '../types';

export const setTemplate = async (
  callWithRequest: CallWithRequest<IndicesPutTemplateParams, CallClusterOptions, unknown>,
  name: string,
  body: unknown
): Promise<unknown> => {
  return callWithRequest('indices.putTemplate', {
    name,
    body,
  });
};
