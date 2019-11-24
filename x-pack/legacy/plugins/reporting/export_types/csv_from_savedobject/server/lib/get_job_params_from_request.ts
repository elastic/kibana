/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade } from '../../../../types';
import { JobParamsPostPayloadPanelCsv, JobParamsPanelCsv } from '../../types';

export function getJobParamsFromRequest(
  request: RequestFacade,
  opts: { isImmediate: boolean }
): JobParamsPanelCsv {
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
