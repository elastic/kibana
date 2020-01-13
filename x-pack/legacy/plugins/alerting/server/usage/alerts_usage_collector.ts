/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsLegacyService } from 'kibana/server';
import { AlertsUsage, AlertsTelemetrySavedObject } from './types';
import { AlertTypeRegistry } from '../alert_type_registry';
import { ALERTS_TELEMETRY_DOC_ID, createAlertsTelemetry } from './alerts_telemetry';

interface Config {
  isAlertsEnabled: boolean;
}

function getSavedObjectsClient(callCluster: CallCluster, savedObjects: SavedObjectsLegacyService) {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const internalRepository = getSavedObjectsRepository(callCluster);
  return new SavedObjectsClient(internalRepository);
}

async function getTotalCount(savedObjectsClient: any) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
  });

  return findResult.total;
}

async function getInUseTotalCount(savedObjectsClient: any) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    fields: ['enabled'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return findResult.saved_objects.filter((savedObject: any) => savedObject.attributes.enabled)
    .length;
}

async function getTotalCountByAlertTypes(
  savedObjectsClient: any,
  alertTypeRegistry: AlertTypeRegistry
) {
  const totalByAlertType = alertTypeRegistry.list().reduce(async (accPromise: any, alertType) => {
    const acc = await accPromise;
    const total = await getTotalCountByAlertType(savedObjectsClient, alertType.id);
    return { ...acc, [alertType.name]: total };
  }, Promise.resolve({}));

  return totalByAlertType;
}

async function getTotalCountByAlertType(savedObjectsClient: any, alertTypeId: string) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    search: alertTypeId,
  });

  return findResult.total;
}

async function getTotalInUseCountByAlertTypes(
  savedObjectsClient: any,
  alertTypeRegistry: AlertTypeRegistry
) {
  const totalByAlertType = alertTypeRegistry.list().reduce(async (accPromise: any, alertType) => {
    const acc = await accPromise;
    const total = await getTotalInUseCountByAlertType(savedObjectsClient, alertType.id);
    return { ...acc, [alertType.name]: total };
  }, Promise.resolve({}));

  return totalByAlertType;
}

async function getTotalInUseCountByAlertType(savedObjectsClient: any, alertTypeId: string) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    search: alertTypeId,
  });

  if (findResult.total === 0) {
    return 0;
  }

  return findResult.saved_objects.filter((savedObject: any) => savedObject.attributes.enabled)
    .length;
}

async function getExecutions(savedObjectsClient: any) {
  try {
    const alertsTelemetrySavedObject = (await savedObjectsClient.get(
      'alerts-telemetry',
      ALERTS_TELEMETRY_DOC_ID
    )) as AlertsTelemetrySavedObject;
    return alertsTelemetrySavedObject.attributes;
  } catch (err) {
    return createAlertsTelemetry();
  }
}

async function getExecutionsCount(savedObjectsClient: any) {
  const alertExecutions = await getExecutions(savedObjectsClient);
  return Object.entries(alertExecutions.excutions_count_by_type).reduce(
    (sum, [key, value]) => sum + value,
    0
  );
}

async function getExecutionsCountByAlertTypes(
  savedObjectsClient: any,
  alertTypeRegistry: AlertTypeRegistry
) {
  const alertExecutions = await getExecutions(savedObjectsClient);
  const totalByAlertType = alertTypeRegistry.list().reduce(
    (res: any, alertType) => ({
      ...res,
      [alertType.name]: alertExecutions.excutions_count_by_type[alertType.name] ?? 0,
    }),
    {}
  );
  return totalByAlertType;
}

export function createAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjects: any,
  alertTypeRegistry: AlertTypeRegistry,
  config: Config
) {
  const { isAlertsEnabled } = config;
  return usageCollection.makeUsageCollector({
    type: 'alerts',
    isReady: () => true,
    fetch: async (callCluster: CallCluster): Promise<AlertsUsage> => {
      const savedObjectsClient = getSavedObjectsClient(callCluster, savedObjects);
      return {
        enabled: isAlertsEnabled,
        count_total: await getTotalCount(savedObjectsClient),
        count_active_total: await getInUseTotalCount(savedObjectsClient),
        executions_total: await getExecutionsCount(savedObjectsClient),
        count_active_by_type: await getTotalInUseCountByAlertTypes(
          savedObjectsClient,
          alertTypeRegistry
        ),
        count_by_type: await getTotalCountByAlertTypes(savedObjectsClient, alertTypeRegistry),
        executions_by_type: await getExecutionsCountByAlertTypes(
          savedObjectsClient,
          alertTypeRegistry
        ),
      };
    },
  });
}

export function registerAlertsUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  savedObjects: SavedObjectsLegacyService,
  alertTypeRegistry: AlertTypeRegistry,
  config: Config
) {
  if (!usageCollection) {
    return;
  }

  const collector = createAlertsUsageCollector(
    usageCollection,
    savedObjects,
    alertTypeRegistry,
    config
  );
  usageCollection.registerCollector(collector);
}
