/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { HttpService } from '../http_service';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';

export function inferenceModelsApiProvider(httpService: HttpService) {
  return {
    /**
     * Gets all inference endpoints
     */
    async getAllInferenceEndpoints() {
      const result = await httpService.http<estypes.InferenceGetResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/_inference/all`,
        method: 'GET',
        version: '1',
      });
      return result;
    },
  };
}
