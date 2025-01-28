/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';

import type { DeleteDataViewApiResponseSchema } from '../types/api_delete_response_schema';

import { DataViewHandler } from './data_view_handler';

async function getDataViewId(dataViewsService: DataViewsService, patternName: string) {
  const iph = new DataViewHandler(dataViewsService);
  return await iph.getDataViewId(patternName);
}

async function deleteDestDataViewById(dataViewsService: DataViewsService, dataViewId: string) {
  const iph = new DataViewHandler(dataViewsService);
  return await iph.deleteDataViewById(dataViewId);
}

interface DeleteDataViewFnOptions {
  dataViewsService: DataViewsService;
  dataViewName: string;
}

export const deleteDataViewFn = async ({
  dataViewsService,
  dataViewName,
}: DeleteDataViewFnOptions): Promise<DeleteDataViewApiResponseSchema> => {
  const response: DeleteDataViewApiResponseSchema = {
    success: false,
  };

  try {
    const dataViewId = await getDataViewId(dataViewsService, dataViewName);
    if (dataViewId) {
      await deleteDestDataViewById(dataViewsService, dataViewId);
    }
    response.success = true;
  } catch (deleteDestDataViewError) {
    response.error = deleteDestDataViewError;
  }

  return response;
};
