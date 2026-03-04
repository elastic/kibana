/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import type { MaintenanceWindowClientContext } from '../../../../common';
import type { MaintenanceWindow } from '../../types';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { findMaintenanceWindowSo } from '../../../data';

export interface MaintenanceWindowAggregationResult {
  maintenanceWindow: {
    buckets: Array<{
      key_as_string: string;
      key: string;
      doc_count: number;
    }>;
  };
}

export async function getActiveMaintenanceWindows(
  context: MaintenanceWindowClientContext,
  cacheIntervalMs?: number
): Promise<MaintenanceWindow[]> {
  const { savedObjectsClient, logger } = context;
  const perPage = 1000;

  const startDate = new Date();
  const startDateISO = startDate.toISOString();

  let eventsKuery: KueryNode;
  if (cacheIntervalMs) {
    // add offset to startDate
    const startDateWithCacheOffset = new Date(startDate.getTime() + cacheIntervalMs);
    const startDateWithCacheOffsetISO = startDateWithCacheOffset.toISOString();
    eventsKuery = nodeBuilder.or([
      nodeBuilder.is('maintenance-window.attributes.events', startDateISO),
      nodeBuilder.is('maintenance-window.attributes.events', startDateWithCacheOffsetISO),
    ]);
  } else {
    eventsKuery = nodeBuilder.is('maintenance-window.attributes.events', startDateISO);
  }

  const filter = nodeBuilder.and([
    eventsKuery,
    nodeBuilder.is('maintenance-window.attributes.enabled', 'true'),
  ]);

  try {
    const firstPageResponse = await findMaintenanceWindowSo({
      savedObjectsClient,
      savedObjectsFindOptions: { filter, page: 1, perPage },
    });

    const savedObjects = [...firstPageResponse.saved_objects];
    const total = firstPageResponse.total;

    for (let page = 2; savedObjects.length < total; page += 1) {
      const response = await findMaintenanceWindowSo({
        savedObjectsClient,
        savedObjectsFindOptions: { filter, page, perPage },
      });

      savedObjects.push(...response.saved_objects);
    }

    return savedObjects.map((savedObject) => {
      return transformMaintenanceWindowAttributesToMaintenanceWindow({
        attributes: savedObject.attributes,
        id: savedObject.id,
      });
    });
  } catch (e) {
    const errorMessage = `Failed to find active maintenance window by interval, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
