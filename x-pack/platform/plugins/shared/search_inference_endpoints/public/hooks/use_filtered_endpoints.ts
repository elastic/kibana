/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import type { FilterOptions } from '../types';
import { getModelId } from '../utils/get_model_id';

export const useFilteredInferenceEndpoints = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  filterOptions: FilterOptions,
  searchKey: string
): InferenceAPIConfigResponse[] => {
  const filteredData: InferenceAPIConfigResponse[] = useMemo(() => {
    let filteredEndpoints = inferenceEndpoints;

    if (filterOptions.provider.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.provider.includes(ServiceProviderKeys[endpoint.service])
      );
    }

    if (filterOptions.type.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.type.includes(endpoint.task_type)
      );
    }

    return filteredEndpoints.filter((endpoint) => {
      const lowerSearchKey = searchKey.toLowerCase();
      const inferenceIdMatch = endpoint.inference_id.toLowerCase().includes(lowerSearchKey);
      const modelId = getModelId(endpoint);
      const modelIdMatch = modelId ? modelId.toLowerCase().includes(lowerSearchKey) : false;
      return inferenceIdMatch || modelIdMatch;
    });
  }, [inferenceEndpoints, searchKey, filterOptions]);

  return filteredData;
};
