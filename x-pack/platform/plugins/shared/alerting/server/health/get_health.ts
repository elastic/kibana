/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { AlertsHealth, HealthStatus } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { RawRule, RuleExecutionStatusErrorReasons } from '../types';
import type { LatestTaskStateSchema } from './task_state';

export const getHealth = async (
  internalSavedObjectsRepository: ISavedObjectsRepository
): Promise<AlertsHealth> => {
  const healthStatuses = {
    decryptionHealth: {
      status: HealthStatus.OK,
      timestamp: '',
    },
    executionHealth: {
      status: HealthStatus.OK,
      timestamp: '',
    },
    readHealth: {
      status: HealthStatus.OK,
      timestamp: '',
    },
  };

  const { saved_objects: decryptErrorData } = await internalSavedObjectsRepository.find<RawRule>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${RuleExecutionStatusErrorReasons.Decrypt}`,
    fields: ['executionStatus'],
    type: RULE_SAVED_OBJECT_TYPE,
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
    namespaces: ['*'],
  });

  if (decryptErrorData.length > 0) {
    healthStatuses.decryptionHealth = {
      status: HealthStatus.Warning,
      timestamp: decryptErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

  const { saved_objects: executeErrorData } = await internalSavedObjectsRepository.find<RawRule>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${RuleExecutionStatusErrorReasons.Execute}`,
    fields: ['executionStatus'],
    type: RULE_SAVED_OBJECT_TYPE,
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
    namespaces: ['*'],
  });

  if (executeErrorData.length > 0) {
    healthStatuses.executionHealth = {
      status: HealthStatus.Warning,
      timestamp: executeErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

  const { saved_objects: readErrorData } = await internalSavedObjectsRepository.find<RawRule>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${RuleExecutionStatusErrorReasons.Read}`,
    fields: ['executionStatus'],
    type: RULE_SAVED_OBJECT_TYPE,
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
    namespaces: ['*'],
  });

  if (readErrorData.length > 0) {
    healthStatuses.readHealth = {
      status: HealthStatus.Warning,
      timestamp: readErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

  const { saved_objects: noErrorData } = await internalSavedObjectsRepository.find<RawRule>({
    filter: 'not alert.attributes.executionStatus.status:error',
    fields: ['executionStatus'],
    type: RULE_SAVED_OBJECT_TYPE,
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    namespaces: ['*'],
  });
  const lastExecutionDate =
    noErrorData.length > 0
      ? noErrorData[0].attributes.executionStatus.lastExecutionDate
      : new Date().toISOString();

  for (const [, statusItem] of Object.entries(healthStatuses)) {
    if (statusItem.status === HealthStatus.OK) {
      statusItem.timestamp = lastExecutionDate;
    }
  }

  return healthStatuses;
};

export const getAlertingHealthStatus = async (
  savedObjects: SavedObjectsServiceStart,
  stateRuns: number
) => {
  const alertingHealthStatus = await getHealth(
    savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE])
  );
  const state: LatestTaskStateSchema = {
    runs: stateRuns + 1,
    health_status: alertingHealthStatus.decryptionHealth.status,
  };
  return {
    state,
  };
};
