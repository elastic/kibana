/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { DuplicateDataViewError } from '@kbn/data-plugin/public';
import type { MlApi } from '../../services/ml_api_service';
import type { FormMessage } from '../../data_frame_analytics/pages/analytics_management/hooks/use_create_analytics_form/state';

interface CreateKibanaDataViewResponse {
  success: boolean;
  error?: string;
  message: string;
  dataViewId?: string;
}

function delay(ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function checkIndexExists(destIndex: string, mlApi: MlApi) {
  let resp;
  let errorMessage;
  try {
    resp = await mlApi.checkIndicesExists({ indices: [destIndex] });
  } catch (e) {
    errorMessage = extractErrorMessage(e);
  }
  return { resp, errorMessage };
}

export async function retryIndexExistsCheck(
  destIndex: string,
  ml: MlApi
): Promise<{
  success: boolean;
  indexExists: boolean;
  errorMessage?: string;
}> {
  let retryCount = 15;

  let resp = await checkIndexExists(destIndex, ml);
  let indexExists = resp.resp && resp.resp[destIndex] && resp.resp[destIndex].exists;

  while (retryCount > 1 && !indexExists) {
    retryCount--;
    await delay(1000);
    resp = await checkIndexExists(destIndex, ml);
    indexExists = resp.resp && resp.resp[destIndex] && resp.resp[destIndex].exists;
  }

  if (indexExists) {
    return { success: true, indexExists: true };
  }

  return {
    success: false,
    indexExists: false,
    ...(resp.errorMessage !== undefined ? { errorMessage: resp.errorMessage } : {}),
  };
}

export const createKibanaDataView = async (
  destinationIndex: string,
  dataViewsService: DataViewsContract,
  ml: MlApi,
  timeFieldName?: string,
  callback?: (response: FormMessage) => void
) => {
  const response: CreateKibanaDataViewResponse = { success: false, message: '' };
  const dataViewName = destinationIndex;
  const exists = await retryIndexExistsCheck(destinationIndex, ml);
  if (exists?.success === true) {
    // index exists - create data view
    if (exists?.indexExists === true) {
      try {
        const dataView = await dataViewsService.createAndSave(
          {
            title: dataViewName,
            ...(timeFieldName ? { timeFieldName } : {}),
          },
          false,
          true
        );
        response.success = true;
        response.message = i18n.translate(
          'xpack.ml.dataframe.analytics.create.createDataViewSuccessMessage',
          {
            defaultMessage: 'Kibana data view {dataViewName} created.',
            values: { dataViewName },
          }
        );
        response.dataViewId = dataView.id;
      } catch (e) {
        // handle data view creation error
        if (e instanceof DuplicateDataViewError) {
          response.error = i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateDataViewErrorMessageError',
            {
              defaultMessage: 'The data view {dataViewName} already exists.',
              values: { dataViewName },
            }
          );
          response.message = i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateDataViewErrorMessage',
            {
              defaultMessage: 'An error occurred creating the Kibana data view:',
            }
          );
        } else {
          response.error = extractErrorMessage(e);
          response.message = i18n.translate(
            'xpack.ml.dataframe.analytics.create.createDataViewErrorMessage',
            {
              defaultMessage: 'An error occurred creating the Kibana data view:',
            }
          );
        }
      }
    }
  } else {
    // Ran out of retries or there was a problem checking index exists
    if (exists?.errorMessage) {
      response.error = i18n.translate(
        'xpack.ml.dataframe.analytics.create.errorCheckingDestinationIndexDataFrameAnalyticsJob',
        {
          defaultMessage: '{errorMessage}',
          values: { errorMessage: exists.errorMessage },
        }
      );
      response.message = i18n.translate(
        'xpack.ml.dataframe.analytics.create.errorOccurredCheckingDestinationIndexDataFrameAnalyticsJob',
        {
          defaultMessage: 'An error occurred checking destination index exists.',
        }
      );
    } else {
      response.error = i18n.translate(
        'xpack.ml.dataframe.analytics.create.destinationIndexNotCreatedForDataFrameAnalyticsJob',
        {
          defaultMessage: 'Destination index has not yet been created.',
        }
      );
      response.message = i18n.translate(
        'xpack.ml.dataframe.analytics.create.unableToCreateDataViewForDataFrameAnalyticsJob',
        {
          defaultMessage: 'Unable to create data view.',
        }
      );
    }
  }
  if (callback !== undefined) {
    callback({ error: response.error, message: response.message });
  }
  return response;
};
