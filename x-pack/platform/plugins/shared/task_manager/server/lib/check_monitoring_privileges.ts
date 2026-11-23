/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { isResponseError } from '@kbn/es-errors';

export const MANAGE_TASK_MANAGER_API_PRIVILEGE = `api:${ApiPrivileges.manage('taskManager')}`;

const MONITOR_CLUSTER_PRIVILEGE = 'monitor';

export interface MonitoringPrivileges {
  /** Whether the caller may see per-task-type monitoring data and reset metric counters. */
  isPrivileged: boolean;
  hasManageTaskManager: boolean;
}

export interface CheckMonitoringPrivilegesOpts {
  request: KibanaRequest;
  getClusterClient: () => Promise<IClusterClient>;
  kibanaIndexName: string;
  getIsSecurityEnabled: () => boolean;
  logger: Logger;
}

const SECURITY_DISABLED_PRIVILEGES: MonitoringPrivileges = {
  isPrivileged: true,
  hasManageTaskManager: true,
};

const NO_PRIVILEGES: MonitoringPrivileges = {
  isPrivileged: false,
  hasManageTaskManager: false,
};

// Elasticsearch doesn't register the security REST handlers when security is disabled.
const isSecurityDisabledError = (error: unknown): boolean => {
  if (!isResponseError(error) || error.statusCode !== 400) {
    return false;
  }
  const { body } = error.meta;
  const reason =
    typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined;
  return typeof reason === 'string' && reason.startsWith('no handler found for uri [/_security/');
};

/**
 * Checks whether the caller has the Kibana `manage_taskManager` API privilege or the ES cluster `monitor` privilege.
 */
export const checkMonitoringPrivileges = async ({
  request,
  getClusterClient,
  kibanaIndexName,
  getIsSecurityEnabled,
  logger,
}: CheckMonitoringPrivilegesOpts): Promise<MonitoringPrivileges> => {
  if (!getIsSecurityEnabled()) {
    return SECURITY_DISABLED_PRIVILEGES;
  }

  const application = `kibana-${kibanaIndexName}`;
  try {
    const clusterClient = await getClusterClient();
    const { cluster, application: applicationPrivileges } = await clusterClient
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({
        cluster: [MONITOR_CLUSTER_PRIVILEGE],
        application: [
          {
            application,
            resources: ['*'],
            privileges: [MANAGE_TASK_MANAGER_API_PRIVILEGE],
          },
        ],
      });

    const hasManageTaskManager =
      applicationPrivileges?.[application]?.['*']?.[MANAGE_TASK_MANAGER_API_PRIVILEGE] === true;
    const hasClusterMonitor = cluster?.[MONITOR_CLUSTER_PRIVILEGE] === true;

    return { isPrivileged: hasManageTaskManager || hasClusterMonitor, hasManageTaskManager };
  } catch (error) {
    if (isSecurityDisabledError(error) || !getIsSecurityEnabled()) {
      return SECURITY_DISABLED_PRIVILEGES;
    }
    logger.warn(
      `Unable to check Task Manager monitoring privileges, returning redacted data: ${error.message}`
    );
    return NO_PRIVILEGES;
  }
};
