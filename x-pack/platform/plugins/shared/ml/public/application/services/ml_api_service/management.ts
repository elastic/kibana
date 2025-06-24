/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import type { HttpService } from '../http_service';
import { useMlKibana } from '../../contexts/kibana';
import type { ManagementListResponse } from '../../../../common/types/management';

import type { MlSavedObjectType } from '../../../../common/types/saved_objects';

export interface InferenceStatsQueryParams {
  from?: number;
  size?: number;
}

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

/**
 * Service with APIs calls to perform inference operations.
 * @param httpService
 */
export function managementApiProvider(httpService: HttpService) {
  return {
    /**
     * Fetches lists of anomaly detection jobs, data frame analytics jobs or trained models
     * for use in the stack management space management table.
     *
     * @param mlSavedObjectType - 'anomaly-detector', 'data-frame-analytics' or 'trained-model'
     */
    getList(mlSavedObjectType: MlSavedObjectType) {
      return httpService.http<ManagementListResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/management/list/${mlSavedObjectType}`,
        method: 'GET',
        version: '1',
      });
    },
  };
}

export type ManagementApiService = ReturnType<typeof managementApiProvider>;

/**
 * Hooks for accessing {@link ManagementApiService} in React components.
 */
export function useManagementApiService(): ManagementApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => managementApiProvider(httpService), [httpService]);
}
