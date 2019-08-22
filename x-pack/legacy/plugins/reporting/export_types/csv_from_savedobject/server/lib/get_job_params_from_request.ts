/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { JobParamsPostPayloadPanelCsv, JobParamsPanelCsv } from '../../types';

export function getJobParamsFromRequest(
  request: Request,
  opts: { isImmediate: boolean }
): Partial<JobParamsPanelCsv> {
  const { savedObjectType, savedObjectId } = request.params;
  const { timerange, state } = request.payload as JobParamsPostPayloadPanelCsv;
  const post = timerange || state ? { timerange, state } : undefined;

  return {
    isImmediate: opts.isImmediate,
    savedObjectType,
    savedObjectId,
    post,
  };
}
