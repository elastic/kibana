/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { Logger } from '@kbn/core/server';
import {
  getCaseAnalyticsDataViewId,
  getCaseActivityDataViewId,
  getCaseLifecycleDataViewId,
} from '../../common/constants';

const getAnalyticsDataViews = (spaceId: string) => [
  {
    id: getCaseAnalyticsDataViewId(spaceId),
    title: `.cases-analytics.*-${spaceId}`,
    name: 'Case Analytics',
    timeFieldName: 'created_at',
  },
  {
    id: getCaseActivityDataViewId(spaceId),
    title: `.cases-analytics-activity.*-${spaceId}`,
    name: 'Case Activity',
    timeFieldName: 'created_at',
  },
  {
    id: getCaseLifecycleDataViewId(spaceId),
    title: `.cases-analytics-lifecycle.*-${spaceId}`,
    name: 'Case Lifecycle',
    timeFieldName: 'latest_activity_at',
  },
];

export const createAnalyticsDataViews = async (
  dataViewsService: DataViewsService,
  logger: Logger,
  spaceId: string
): Promise<void> => {
  for (const { id, title, name, timeFieldName } of getAnalyticsDataViews(spaceId)) {
    try {
      // Always build a fresh data view with the correct namespaces and call
      // createSavedObject with override: true (idempotent upsert).
      //
      // Avoid the get→reconcile pattern: the dataViewsService is backed by a
      // cross-namespace internal repository, so `get` may return a data view
      // whose stored `namespaces` list doesn't match the target space. Passing
      // that object straight back into `createSavedObject(existing, true)` then
      // overwrites the SO with the wrong namespace list — effectively deleting
      // the data view from the space it was supposed to live in.
      //
      // Use createSavedObject directly to avoid createAndSave's setDefault()
      // call which would silently override the user's chosen default data view.
      const dataView = await dataViewsService.create({
        id,
        title,
        name,
        timeFieldName,
        managed: true,
        namespaces: [spaceId],
        allowNoIndex: true,
      });
      await dataViewsService.createSavedObject(dataView, true);
      logger.debug(`Provisioned cases analytics data view: ${name} in space ${spaceId}`);
    } catch (error) {
      logger.error(`Failed to provision cases analytics data view "${name}": ${error.message}`);
    }
  }
};
