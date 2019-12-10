/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsRepository } from 'src/core/server/saved_objects/service/lib/repository';
import {
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
  UpgradeAssistantTelemetry,
  UpgradeAssistantTelemetrySavedObject,
  UpgradeAssistantTelemetrySavedObjectAttributes,
} from '../../../../common/types';
import { ServerShim } from '../../types';
import { isDeprecationLoggingEnabled } from '../es_deprecation_logging_apis';

async function getSavedObjectAttributesFromRepo(
  savedObjectsRepository: SavedObjectsRepository,
  docType: string,
  docID: string
) {
  try {
    return (await savedObjectsRepository.get(docType, docID)).attributes;
  } catch (e) {
    return null;
  }
}

async function getDeprecationLoggingStatusValue(callCluster: any): Promise<boolean> {
  try {
    const loggerDeprecationCallResult = await callCluster('cluster.getSettings', {
      includeDefaults: true,
    });

    return isDeprecationLoggingEnabled(loggerDeprecationCallResult);
  } catch (e) {
    return false;
  }
}

export async function fetchUpgradeAssistantMetrics(
  callCluster: any,
  server: ServerShim
): Promise<UpgradeAssistantTelemetry> {
  const { getSavedObjectsRepository } = server.savedObjects;
  const savedObjectsRepository = getSavedObjectsRepository(callCluster);
  const upgradeAssistantSOAttributes = await getSavedObjectAttributesFromRepo(
    savedObjectsRepository,
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID
  );
  const deprecationLoggingStatusValue = await getDeprecationLoggingStatusValue(callCluster);

  const getTelemetrySavedObject = (
    upgradeAssistantTelemetrySavedObjectAttrs: UpgradeAssistantTelemetrySavedObjectAttributes | null
  ): UpgradeAssistantTelemetrySavedObject => {
    const defaultTelemetrySavedObject = {
      ui_open: {
        overview: 0,
        cluster: 0,
        indices: 0,
      },
      ui_reindex: {
        close: 0,
        open: 0,
        start: 0,
        stop: 0,
      },
    };

    if (!upgradeAssistantTelemetrySavedObjectAttrs) {
      return defaultTelemetrySavedObject;
    }

    const upgradeAssistantTelemetrySOAttrsKeys = Object.keys(
      upgradeAssistantTelemetrySavedObjectAttrs
    );
    const telemetryObj = defaultTelemetrySavedObject;

    upgradeAssistantTelemetrySOAttrsKeys.forEach((key: string) => {
      set(telemetryObj, key, upgradeAssistantTelemetrySavedObjectAttrs[key]);
    });

    return telemetryObj as UpgradeAssistantTelemetrySavedObject;
  };

  return {
    ...getTelemetrySavedObject(upgradeAssistantSOAttributes),
    features: {
      deprecation_logging: {
        enabled: deprecationLoggingStatusValue,
      },
    },
  };
}

export function registerUpgradeAssistantUsageCollector(
  usageCollection: UsageCollectionSetup,
  server: ServerShim
) {
  const upgradeAssistantUsageCollector = usageCollection.makeUsageCollector({
    type: UPGRADE_ASSISTANT_TYPE,
    isReady: () => true,
    fetch: async (callCluster: any) => fetchUpgradeAssistantMetrics(callCluster, server),
  });
  usageCollection.registerCollector(upgradeAssistantUsageCollector);
}
