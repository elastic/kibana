/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';

const ELASTICSEARCH_PROVIDER = 'elasticsearch';
const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

export const getInferenceApiParams = (data: any, enforceAdaptiveAllocations: boolean) => {
  if (
    enforceAdaptiveAllocations &&
    data?.config?.provider === ELASTICSEARCH_PROVIDER &&
    data?.config?.providerConfig
  ) {
    const dataToSend = cloneDeep(data);
    const maxAllocations = data.config.providerConfig.max_number_of_allocations;

    dataToSend.config.providerConfig!.adaptive_allocations = {
      enabled: true,
      min_number_of_allocations: MIN_ALLOCATIONS,
      ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
    };
    // num_threads: Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
    dataToSend.config.providerConfig!.num_threads = DEFAULT_NUM_THREADS;
    delete dataToSend?.config?.providerConfig?.max_number_of_allocations;

    return dataToSend;
  }
};
