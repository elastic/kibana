/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { reduce } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { Shard } from '../../common/utils/converters';
import type { SOShard } from '../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

export const convertECSMappingToArray = (ecsMapping: Record<string, object> | undefined) =>
  ecsMapping
    ? Object.entries(ecsMapping).map((item) => ({
        key: item[0],
        value: item[1],
      }))
    : undefined;

export const convertECSMappingToObject = (
  ecsMapping: Array<{ key: string; value: Record<string, object> }>
) =>
  reduce(
    ecsMapping,
    (acc, value) => {
      acc[value.key] = value.value;

      return acc;
    },
    {} as Record<string, { field?: string; value?: string }>
  );

export const convertShardsToArray = (shards: Shard): SOShard =>
  Object.entries(shards).map((item) => ({
    key: item[0],
    value: item[1],
  }));

export const convertShardsToObject = (shards: Array<{ key: string; value: number }>) =>
  reduce(
    shards,
    (acc, value) => {
      acc[value.key] = value.value;

      return acc;
    },
    {} as Record<string, number>
  );

export const getInternalSavedObjectsClient = async (
  getStartServices: CoreSetup['getStartServices']
) => {
  const [coreStart] = await getStartServices();

  return new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
};

/**
 * Fetches all package policy IDs for osquery_manager integration in the current space.
 * @param packagePolicyService - Fleet's package policy service
 * @param soClient - Saved objects client
 * @returns Array of package policy IDs
 */
export const fetchOsqueryPackagePolicyIds = async (
  soClient: SavedObjectsClientContract,
  osqueryContext: OsqueryAppContext
): Promise<string[]> => {
  const logger = osqueryContext.logFactory.get('fetchOsqueryPackagePolicyIds');
  const packagePolicyService = osqueryContext.service.getPackagePolicyService();

  if (!packagePolicyService) {
    throw new Error('Package policy service is not available');
  }

  logger.debug('Fetching osquery package policy IDs');

  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`;
  const idIterable = await packagePolicyService.fetchAllItemIds(soClient, { kuery });
  const ids: string[] = [];
  for await (const batch of idIterable) {
    ids.push(...batch);
  }

  logger.debug(`Fetched ${ids.length} osquery package policy IDs`);

  return ids;
};
