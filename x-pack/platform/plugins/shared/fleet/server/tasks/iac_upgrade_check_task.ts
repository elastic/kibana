/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';
import { IAC_UPGRADE_TASK_FLOW } from '../../common/telemetry/iac_provisioner_events';
import type { IacKeyVerificationOutcome } from '../../common/telemetry/iac_provisioner_events';
import { AWS_CLOUD_PROVIDER } from '../../common/types/models/cloud_connector';
import type { IacUpgradeStatus } from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import { appContextService } from '../services';
import {
  compareIacKey,
  getCloudConnectorIntegrationSelections,
} from '../services/cloud_connectors';
import { reportIacProvisionerUpgradeCheckCompleted } from '../services/telemetry/iac_provisioner_telemetry';
import { isIacProvisionerEnabled } from '../services/utils/iac_provisioner';

import { throwIfAborted } from './utils';

const TASK_TYPE = 'fleet:iac_upgrade_check';
const TASK_TITLE = 'Fleet IaC template upgrade check';
const TASK_TIMEOUT = '1h';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
// Placeholder cadence for MVP; the IaCP team may want shorter (https://github.com/elastic/ingest-dev/issues/9415).
const TASK_INTERVAL = '24h';
const CONNECTORS_PER_PAGE = 50;
export const IAC_UPGRADE_CHECK_TASK = '[IaC Upgrade Check Task]';

type ConnectorOutcome = IacUpgradeStatus | 'skipped';

export interface IacUpgradeCheckCounts {
  upToDate: number;
  upgradeAvailable: number;
  skipped: number;
}

export const registerIacUpgradeCheckTask = (taskManager: TaskManagerSetupContract): void => {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({
        signal,
      }: {
        taskInstance: ConcreteTaskInstance;
        signal: AbortSignal;
      }) => ({
        run: async () => {
          await runIacUpgradeCheckTask(signal);
        },
      }),
    },
  });
};

export const scheduleIacUpgradeCheckTask = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: TASK_INTERVAL },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`${IAC_UPGRADE_CHECK_TASK} Error scheduling IaC upgrade check task.`, { error });
  }
};

/**
 * For every AWS connector (IaCP's only provider today), compare the stored `iac_key` with the
 * key IaCP produces now for the connector's live integration set. No key means the static template
 * is deployed and must be flagged as upgrade available. IaCP unreachable means leave the last
 * known status untouched (fail open).
 */
export const runIacUpgradeCheckTask = async (
  signal: AbortSignal
): Promise<IacUpgradeCheckCounts> => {
  const logger = appContextService.getLogger().get('iac-upgrade-check');
  const counts: IacUpgradeCheckCounts = { upToDate: 0, upgradeAvailable: 0, skipped: 0 };
  const startTime = Date.now();

  if (!isIacProvisionerEnabled()) {
    logger.debug(`${IAC_UPGRADE_CHECK_TASK} IaC Provisioner disabled, skipping`);
    return counts;
  }

  logger.info(`${IAC_UPGRADE_CHECK_TASK} Task run started`);
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const finder = soClient.createPointInTimeFinder<CloudConnectorSOAttributes>({
    type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
    filter: `${CLOUD_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.cloudProvider: "${AWS_CLOUD_PROVIDER}"`,
    perPage: CONNECTORS_PER_PAGE,
    fields: ['cloudProvider', 'iac_key', 'iac_upgrade_status'],
  });

  try {
    for await (const { saved_objects: connectors } of finder.find()) {
      for (const connector of connectors) {
        throwIfAborted(signal);
        // One bad connector (e.g. an SO read failure while deriving its integration set) must not
        // abort the run and silently skip everything after it — count it and move on.
        let outcome: ConnectorOutcome;
        try {
          outcome = await checkConnector(soClient, connector, logger);
        } catch (error) {
          throwIfAborted(signal);
          logger.error(
            `${IAC_UPGRADE_CHECK_TASK} Connector ${connector.id} check failed: ${error.message}`
          );
          outcome = 'skipped';
        }
        if (outcome === 'up_to_date') {
          counts.upToDate += 1;
        } else if (outcome === 'upgrade_available') {
          counts.upgradeAvailable += 1;
        } else {
          counts.skipped += 1;
        }
      }
    }
  } catch (error) {
    if (signal.aborted) {
      logger.info(`${IAC_UPGRADE_CHECK_TASK} Task was aborted`);
    } else {
      logger.error(`${IAC_UPGRADE_CHECK_TASK} Task run failed: ${error.message}`);
    }
    throw error;
  } finally {
    await finder.close();
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    `${IAC_UPGRADE_CHECK_TASK} Done in ${durationMs}ms: ${counts.upToDate} up to date, ${counts.upgradeAvailable} upgrade available, ${counts.skipped} skipped`
  );
  reportIacProvisionerUpgradeCheckCompleted({ ...counts, durationMs });
  return counts;
};

const toUpgradeStatus = (outcome: IacKeyVerificationOutcome): IacUpgradeStatus | undefined => {
  switch (outcome) {
    case 'matches':
      return 'up_to_date';
    case 'no_key':
    case 'key_mismatch':
      return 'upgrade_available';
    default:
      return undefined;
  }
};

const checkConnector = async (
  soClient: SavedObjectsClientContract,
  { id, attributes }: SavedObject<CloudConnectorSOAttributes>,
  logger: Logger
): Promise<ConnectorOutcome> => {
  const selections = await getCloudConnectorIntegrationSelections(soClient, id);
  const outcome = await compareIacKey(soClient, attributes, selections, {
    flow: IAC_UPGRADE_TASK_FLOW,
    contextForLog: `connector ${id}`,
  });
  const status = toUpgradeStatus(outcome);
  if (status === undefined) {
    // getCurrentIacKey already warned for key_unavailable; the other two are expected states.
    logger.debug(`${IAC_UPGRADE_CHECK_TASK} Connector ${id} not comparable (${outcome}), skipping`);
    return 'skipped';
  }

  try {
    await soClient.update<CloudConnectorSOAttributes>(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, id, {
      iac_upgrade_status: status,
      iac_upgrade_checked_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`${IAC_UPGRADE_CHECK_TASK} Failed to update connector ${id}: ${error.message}`);
    return 'skipped';
  }
  if (attributes.iac_upgrade_status !== status) {
    logger.info(
      `${IAC_UPGRADE_CHECK_TASK} Connector ${id} status ${
        attributes.iac_upgrade_status ?? '<unset>'
      } → ${status}`
    );
  }
  return status;
};
