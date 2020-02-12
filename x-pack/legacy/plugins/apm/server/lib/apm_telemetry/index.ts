/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { countBy } from 'lodash';
import { SavedObjectAttributes, SavedObjectsClient } from 'src/core/server';
import { isAgentName } from '../../../common/agent_name';
import {
  APM_SERVICES_TELEMETRY_SAVED_OBJECT_TYPE,
  APM_SERVICES_TELEMETRY_SAVED_OBJECT_ID
} from '../../../common/apm_saved_object_constants';
import { UsageCollectionSetup } from '../../../../../../../src/plugins/usage_collection/server';

export function createApmTelementry(
  agentNames: string[] = []
): SavedObjectAttributes {
  const validAgentNames = agentNames.filter(isAgentName);
  return {
    has_any_services: validAgentNames.length > 0,
    services_per_agent: countBy(validAgentNames)
  };
}

type ISavedObjectsClient = Pick<SavedObjectsClient, 'create' | 'get'>;

export async function storeApmServicesTelemetry(
  savedObjectsClient: ISavedObjectsClient,
  apmTelemetry: SavedObjectAttributes
) {
  return savedObjectsClient.create(
    APM_SERVICES_TELEMETRY_SAVED_OBJECT_TYPE,
    apmTelemetry,
    {
      id: APM_SERVICES_TELEMETRY_SAVED_OBJECT_ID,
      overwrite: true
    }
  );
}

export function makeApmUsageCollector(
  usageCollector: UsageCollectionSetup,
  savedObjectsRepository: ISavedObjectsClient
) {
  const apmUsageCollector = usageCollector.makeUsageCollector({
    type: 'apm',
    fetch: async () => {
      try {
        const apmTelemetrySavedObject = await savedObjectsRepository.get(
          APM_SERVICES_TELEMETRY_SAVED_OBJECT_TYPE,
          APM_SERVICES_TELEMETRY_SAVED_OBJECT_ID
        );
        return apmTelemetrySavedObject.attributes;
      } catch (err) {
        return createApmTelementry();
      }
    },
    isReady: () => true
  });

  usageCollector.registerCollector(apmUsageCollector);
}
