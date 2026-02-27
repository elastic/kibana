/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService, RuntimeField } from '@kbn/data-views-plugin/common';

import type { CreateDataViewApiResponseSchema } from '../types/api_create_response_schema';

interface CreateDataViewFnOptions {
  dataViewsService: DataViewsService;
  dataViewName: string;
  runtimeMappings: Record<string, RuntimeField>;
  timeFieldName?: string;
  errorFallbackId: string;
}

export const createDataViewFn = async ({
  dataViewsService,
  dataViewName,
  runtimeMappings,
  timeFieldName,
  // A fall back id to be able to track the response
  // because in case of an error we don't get a data view id.
  errorFallbackId,
}: CreateDataViewFnOptions): Promise<CreateDataViewApiResponseSchema> => {
  const response: CreateDataViewApiResponseSchema = {
    dataViewsCreated: [],
    dataViewsErrors: [],
  };

  try {
    const dataViewsResp = await dataViewsService.createAndSave(
      {
        title: dataViewName,
        timeFieldName,
        runtimeFieldMap: runtimeMappings,
        allowNoIndex: true,
      },
      false,
      true
    );

    if (dataViewsResp.id) {
      response.dataViewsCreated = [{ id: dataViewsResp.id }];
    }
  } catch (error) {
    response.dataViewsErrors = [{ id: errorFallbackId, error }];
  }

  return response;
};
