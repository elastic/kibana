/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsLegacyService } from 'kibana/server';
import { ActionsUsage } from './types';
import { ActionTypeRegistry } from '../action_type_registry';

interface Config {
  isActionsEnabled: boolean;
}

function getSavedObjectsClient(callCluster: CallCluster, savedObjects: SavedObjectsLegacyService) {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const internalRepository = getSavedObjectsRepository(callCluster);
  return new SavedObjectsClient(internalRepository);
}

async function getTotalCount(savedObjectsClient: any) {
  const findResult = await savedObjectsClient.find({
    type: 'action',
  });

  return findResult.total;
}

async function getInUseTotalCount(savedObjectsClient: any) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    fields: ['actions'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return new Set(
    findResult.saved_objects.reduce(
      (actionIds: string[], savedObj: any) =>
        actionIds.concat(
          savedObj.references
            .filter((ref: any) => ref.type === 'action')
            .map((action: any) => action.id)
        ),
      []
    )
  ).size;
}

async function getTotalCountByActionTypes(
  savedObjectsClient: any,
  actionTypeRegistry: ActionTypeRegistry
) {
  const totalByActionType = actionTypeRegistry
    .list()
    .reduce(async (accPromise: any, actionType) => {
      const acc = await accPromise;
      const total = await getTotalCountByActionType(savedObjectsClient, actionType.id);
      return { ...acc, [actionType.name]: total };
    }, Promise.resolve({}));

  return totalByActionType;
}

async function getTotalCountByActionType(savedObjectsClient: any, actionTypeId: string) {
  const findResult = await savedObjectsClient.find({
    type: 'action',
    searchFields: ['actionTypeId'],
    search: actionTypeId,
  });

  return findResult.total;
}

async function getTotalInUseCountByActionTypes(
  savedObjectsClient: any,
  actionTypeRegistry: ActionTypeRegistry
) {
  const totalByActionType = actionTypeRegistry
    .list()
    .reduce(async (accPromise: any, actionType) => {
      const acc = await accPromise;
      const total = await getTotalInUseCountByActionType(savedObjectsClient, actionType.id);
      return { ...acc, [actionType.name]: total };
    }, Promise.resolve({}));

  return totalByActionType;
}

async function getTotalInUseCountByActionType(savedObjectsClient: any, actionTypeId: string) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    fields: ['actions'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return new Set(
    findResult.saved_objects.reduce((actionIds: string[], savedObj: any) => {
      const refs = savedObj.attributes.actions
        .filter((ref: any) => ref.actionTypeId === actionTypeId)
        .map((action: any) => action.actionRef);
      const ids = savedObj.references
        .filter((reference: any) => refs.includes(reference.name))
        .map((action: any) => action.id);
      return actionIds.concat(ids);
    }, [])
  ).size;
}

async function getExecutionsCountByActionTypes(
  savedObjectsClient: any,
  actionTypeRegistry: ActionTypeRegistry
) {
  const totalByActionType = actionTypeRegistry
    .list()
    .reduce((res: any, actionType) => ({ ...res, [actionType.name]: 0 }), {});
  return totalByActionType;
}

export function createActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjects: any,
  actionTypeRegistry: ActionTypeRegistry,
  config: Config
) {
  const { isActionsEnabled } = config;
  return usageCollection.makeUsageCollector({
    type: 'actions',
    isReady: () => true,
    fetch: async (callCluster: CallCluster): Promise<ActionsUsage> => {
      const savedObjectsClient = getSavedObjectsClient(callCluster, savedObjects);
      return {
        enabled: isActionsEnabled,
        count_total: await getTotalCount(savedObjectsClient),
        count_active_total: await getInUseTotalCount(savedObjectsClient),
        executions_total: 0,
        count_active_by_type: await getTotalInUseCountByActionTypes(
          savedObjectsClient,
          actionTypeRegistry
        ),
        count_by_type: await getTotalCountByActionTypes(savedObjectsClient, actionTypeRegistry),
        executions_by_type: await getExecutionsCountByActionTypes(
          savedObjectsClient,
          actionTypeRegistry
        ),
      };
    },
  });
}

export function registerActionsUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  savedObjects: SavedObjectsLegacyService,
  actionTypeRegistry: ActionTypeRegistry,
  config: Config
) {
  if (!usageCollection) {
    return;
  }

  const collector = createActionsUsageCollector(
    usageCollection,
    savedObjects,
    actionTypeRegistry,
    config
  );
  usageCollection.registerCollector(collector);
}
