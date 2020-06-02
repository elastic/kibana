/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { JobParamsPanelCsv, JobParamsPostPayloadPanelCsv } from '../../types';

export function getJobParamsFromRequest(
  request: KibanaRequest,
  opts: { isImmediate: boolean }
): JobParamsPanelCsv {
  const { savedObjectType, savedObjectId } = request.params as {
    savedObjectType: string;
    savedObjectId: string;
  };
  const { timerange, state } = request.body as JobParamsPostPayloadPanelCsv;

  const post = timerange || state ? { timerange, state } : undefined;

  return {
    isImmediate: opts.isImmediate,
    savedObjectType,
    savedObjectId,
    post,
  };
}
