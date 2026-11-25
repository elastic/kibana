/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { JobType } from '@kbn/ml-common-types/saved_objects';
import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getDataViewAndSavedSearchCallback } from '../../util/index_utils';
import type { MlApi } from '../ml_api_service';
import { mlJobCapsServiceAnalyticsFactory } from './new_job_capabilities_service_analytics';
import { mlJobCapsServiceFactory } from './new_job_capabilities_service';
import { toastNotificationServiceProvider } from '../toast_notification_service/toast_notification_service';

export const ANOMALY_DETECTOR = 'anomaly-detector';
export const DATA_FRAME_ANALYTICS = 'data-frame-analytics';

async function getDataViewForJobCaps(
  dataViewId: string,
  savedSearchId: string,
  dataViewsService: DataViewsContract,
  savedSearchService: SavedSearchPublicPluginStart
): Promise<DataView | null> {
  if (dataViewId !== undefined) {
    return dataViewsService.get(dataViewId);
  }

  if (savedSearchId !== undefined) {
    const { dataView } = await getDataViewAndSavedSearchCallback({
      savedSearchService,
      dataViewsService,
    })(savedSearchId);
    if (dataView === null) {
      // eslint-disable-next-line no-console
      console.error('Cannot retrieve data view from saved search');
    }
    return dataView;
  }

  return null;
}

// called in the routing resolve block to initialize the NewJobCapabilites
// service for the corresponding job type with the currently selected data view
export function loadNewJobCapabilities(
  dataViewId: string,
  savedSearchId: string,
  mlApi: MlApi,
  dataViewsService: DataViewsContract,
  savedSearchService: SavedSearchPublicPluginStart,
  jobType: JobType,
  notifications: NotificationsStart,
  projectRouting?: string
) {
  return new Promise(async (resolve, reject) => {
    try {
      const dataView = await getDataViewForJobCaps(
        dataViewId,
        savedSearchId,
        dataViewsService,
        savedSearchService
      );
      if (dataView === null) {
        reject();
        return;
      }

      if (jobType === ANOMALY_DETECTOR) {
        const serviceToUse = mlJobCapsServiceFactory(mlApi);
        await serviceToUse.initializeFromDataVIew(dataView, true, true, projectRouting);
        resolve(serviceToUse.newJobCaps);
        return;
      }

      const serviceToUse = mlJobCapsServiceAnalyticsFactory(mlApi);
      await serviceToUse.initializeFromDataVIew(dataView);
      resolve(serviceToUse.newJobCaps);
    } catch (error) {
      toastNotificationServiceProvider(notifications.toasts).displayErrorToast(
        error,
        i18n.translate('xpack.ml.newJob.capabilities.loadErrorTitle', {
          defaultMessage: 'Failed to load job capabilities',
        })
      );
      reject(error);
    }
  });
}
