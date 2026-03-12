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
      const existing = await dataViewsService.get(id).catch(() => null);

      if (existing) {
        // Reconcile: if the index pattern or time field drifted (e.g. after an
        // index-naming migration), update the saved object in place.
        if (existing.getIndexPattern() !== title || existing.timeFieldName !== timeFieldName) {
          existing.setIndexPattern(title);
          existing.timeFieldName = timeFieldName;
          await dataViewsService.createSavedObject(existing, true);
          logger.info(`Updated cases analytics data view: ${name} in space ${spaceId}`);
        }
      } else {
        // Use createSavedObject directly to avoid createAndSave's setDefault()
        // call which would override the user's chosen default data view.
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
        logger.info(`Created cases analytics data view: ${name} in space ${spaceId}`);
      }
    } catch (error) {
      logger.error(`Failed to create cases analytics data view "${name}": ${error.message}`);
    }
  }
};
