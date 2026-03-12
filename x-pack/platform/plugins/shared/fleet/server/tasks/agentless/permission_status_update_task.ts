/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import type { VerificationResultDocument } from '../../../common/types/models/cloud_connector';
import { appContextService } from '../../services';
import { throwIfAborted } from '../utils';

const TASK_TYPE = 'fleet:permission-status-update-task';
const TASK_TITLE = 'Fleet OTel Permission Status Update Task';
const TASK_TIMEOUT = '2m';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '1m';
const LOG_PREFIX = '[OTelVerifier]';
// const VERIFICATION_INDEX = 'logs-verifier_otel.verification-default';

const MOCK_VERIFICATION_RESULTS: VerificationResultDocument[] = [
  {
    '@timestamp': '2026-03-09T12:00:00.000Z',
    cloud_connector_id: 'connector-001',
    policy: { id: 'policy-aws-security', name: 'AWS Security Monitoring' },
    policy_template: 'cloudtrail',
    package: { name: 'aws', title: 'AWS', version: '2.17.0' },
    package_policy: { id: 'pp-cloudtrail-001' },
    namespace: 'default',
    provider: { type: 'aws', account: '123456789012', region: 'us-east-1' },
    account_type: 'single_account',
    permission: {
      action: 's3:GetObject',
      category: 'data_access',
      status: 'granted',
      required: true,
    },
    verification: {
      method: 'api_call',
      endpoint: 's3:GetObject',
      duration_ms: 120,
      verified_at: '2026-03-09T12:00:00.000Z',
    },
  },
  {
    '@timestamp': '2026-03-09T12:00:01.000Z',
    cloud_connector_id: 'connector-001',
    policy: { id: 'policy-aws-security', name: 'AWS Security Monitoring' },
    policy_template: 'cloudtrail',
    package: { name: 'aws', title: 'AWS', version: '2.17.0' },
    package_policy: { id: 'pp-cloudtrail-001' },
    namespace: 'default',
    provider: { type: 'aws', account: '123456789012', region: 'us-east-1' },
    account_type: 'single_account',
    permission: {
      action: 'sqs:ReceiveMessage',
      category: 'data_access',
      status: 'granted',
      required: true,
    },
    verification: {
      method: 'api_call',
      endpoint: 'sqs:ReceiveMessage',
      duration_ms: 85,
      verified_at: '2026-03-09T12:00:01.000Z',
    },
  },
  {
    '@timestamp': '2026-03-09T12:00:02.000Z',
    cloud_connector_id: 'connector-001',
    policy: { id: 'policy-aws-security', name: 'AWS Security Monitoring' },
    policy_template: 'cloudtrail',
    package: { name: 'aws', title: 'AWS', version: '2.17.0' },
    package_policy: { id: 'pp-cloudtrail-001' },
    namespace: 'default',
    provider: { type: 'aws', account: '123456789012', region: 'us-east-1' },
    account_type: 'single_account',
    permission: {
      action: 'cloudtrail:LookupEvents',
      category: 'data_access',
      status: 'denied',
      required: true,
      error_code: 'AccessDenied',
      error_message: 'User is not authorized to perform cloudtrail:LookupEvents',
    },
    verification: {
      method: 'api_call',
      endpoint: 'cloudtrail:LookupEvents',
      duration_ms: 200,
      verified_at: '2026-03-09T12:00:02.000Z',
    },
  },
];

export function registerPermissionStatusUpdateTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          run: async () => {
            await runPermissionStatusUpdateTask(abortController);
          },
          cancel: async () => {},
        };
      },
    },
  });
}

export async function schedulePermissionStatusUpdateTask(taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: TASK_INTERVAL,
      },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`${LOG_PREFIX} Error scheduling permission status update task.`, { error });
  }
}

/*
 * Task flow (runs every 1 minute):
 *
 * Step 1 - Pre-filter: Aggregate package policies by cloud_connector_id to get
 *          only connector IDs that have installed packages. Skip if none found.
 *
 * Step 2 - Query: Single ES query using terms filter on all connector IDs with
 *          a 5-minute time range to fetch only recent verification results.
 *          (Currently using mock data; real ES query is commented out.)
 *
 * Step 3 - Group: Group verification results by cloud_connector_id in memory.
 *
 * Step 4 - Update: For each connector with results, compute the verification
 *          status (success if all granted, failed otherwise) and update the
 *          cloud connector SO one by one.
 */
async function runPermissionStatusUpdateTask(abortController: AbortController) {
  const logger = appContextService.getLogger().get('otel-verifier-status');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${LOG_PREFIX} OTel verifier is disabled, skipping status update`);
    return;
  }

  logger.info(`${LOG_PREFIX} Status update task started`);

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  // const esClient = appContextService.getInternalUserESClient();

  try {
    throwIfAborted(abortController);

    // Step 1: Pre-filter by package policies to get de-duplicated connector IDs with installed packages
    const packagePolicies = await soClient.find<{ cloud_connector_id?: string }>({
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id: *`,
      perPage: 1000,
    });
    if (packagePolicies.saved_objects.length === 0) {
      logger.debug(`${LOG_PREFIX} No package policies with cloud connectors found`);
      return;
    }

    const connectorIds = [
      ...new Set(
        packagePolicies.saved_objects
          .map((pp) => pp.attributes.cloud_connector_id)
          .filter((id): id is string => !!id)
      ),
    ];

    if (connectorIds.length === 0) {
      logger.debug(`${LOG_PREFIX} No connectors with installed packages found`);
      return;
    }

    logger.info(`${LOG_PREFIX} Found ${connectorIds.length} connectors with installed packages`);

    throwIfAborted(abortController);

    // Step 2: ES query for the latest verification result per connector (5-min window)
    // Uses collapse to deduplicate by connector ID, returning only the latest doc per connector.
    // TODO: Uncomment when verification index is available
    // const searchResult = await esClient.search<VerificationResultDocument>({
    //   index: VERIFICATION_INDEX,
    //   query: {
    //     bool: {
    //       filter: [
    //         { terms: { 'cloud_connector_id.keyword': connectorIds } },
    //         { range: { '@timestamp': { gte: 'now-5m' } } },
    //       ],
    //     },
    //   },
    //   size: 1000,
    //   sort: [{ '@timestamp': { order: 'desc' } }],
    //   collapse: { field: 'cloud_connector_id.keyword' },
    // });

    // Step 3: Extract results -- already one per connector thanks to collapse
    // TODO: Replace mock with real hits when ES query is uncommented
    // const latestResults = searchResult.hits.hits
    //   .map((hit) => hit._source)
    //   .filter((doc): doc is VerificationResultDocument => !!doc);

    // Mock: pick the latest result per connector by timestamp
    const sorted = [...MOCK_VERIFICATION_RESULTS].sort((a, b) =>
      b['@timestamp'].localeCompare(a['@timestamp'])
    );
    const seen = new Set<string>();
    const latestResults: VerificationResultDocument[] = [];
    for (const result of sorted) {
      if (!seen.has(result.cloud_connector_id)) {
        seen.add(result.cloud_connector_id);
        latestResults.push(result);
      }
    }

    // Step 4: Update each connector's verification status one by one
    for (const result of latestResults) {
      throwIfAborted(abortController);

      const { cloud_connector_id: connectorId, permission } = result;

      try {
        const status = permission.status === 'granted' ? 'success' : 'failed';
        const latestTimestamp = result['@timestamp'] ?? new Date().toISOString();

        logger.info(
          `${LOG_PREFIX} Verification for connector ${connectorId}: ${status} ` +
            `(action: ${permission.action}, permission: ${permission.status})`
        );

        await soClient.update<CloudConnectorSOAttributes>(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          {
            verification_status: status,
            verification_timestamp: latestTimestamp,
            verification_permissions: [permission],
          }
        );
      } catch (error) {
        logger.error(
          `${LOG_PREFIX} Failed to update verification status for connector ${connectorId}: ${error.message}`
        );
      }
    }

    logger.info(`${LOG_PREFIX} Status update task completed`);
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.warn(`${LOG_PREFIX} Status update task was aborted`);
      return;
    }
    logger.error(`${LOG_PREFIX} Status update task failed: ${error.message}`);
    throw error;
  }
}
