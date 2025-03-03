/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resetResults,
  resetErrors,
  resetGroups,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';

import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const overridesHandlerFactory =
  <T extends ApiVersion>({
    requestBody,
    logDebugMessage,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  () => {
    if (!requestBody.overrides) {
      logDebugMessage('Full Reset.');
      responseStream.push(resetResults());
    } else {
      logDebugMessage('Reset Errors.');
      responseStream.push(resetErrors());
    }

    if (requestBody.overrides?.regroupOnly) {
      logDebugMessage('Reset Groups.');
      responseStream.push(resetGroups());
    }

    if (requestBody.overrides?.loaded) {
      logDebugMessage(`Set 'loaded' override to '${requestBody.overrides?.loaded}'.`);
      stateHandler.loaded(requestBody.overrides?.loaded);
    }
  };
