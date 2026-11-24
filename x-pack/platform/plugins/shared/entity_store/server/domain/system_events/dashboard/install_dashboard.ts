/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getSystemEventsDashboardId } from '../../../../common/domain/system_events';
import {
  SYSTEM_EVENTS_DASHBOARD_VERSION,
  buildSystemEventsDashboard,
} from './system_events_dashboard';

const DASHBOARD_TYPE = 'dashboard';

export interface SystemEventsDashboardClient {
  /** Installs the dashboard unless the installed one is already at the current version. */
  install(): Promise<void>;
  uninstall(): Promise<void>;
}

/**
 * Manages the per-space system events dashboard as the internal user, so any user who can
 * install Entity Store gets it, without needing dashboard write access.
 */
export const createSystemEventsDashboardClient = ({
  savedObjects,
  namespace,
  logger,
}: {
  savedObjects: CoreStart['savedObjects'];
  namespace: string;
  logger: Logger;
}): SystemEventsDashboardClient => {
  const soNamespace = namespace === 'default' ? undefined : namespace;
  const dashboardId = getSystemEventsDashboardId(namespace);
  const isDashboardTypeRegistered = () =>
    savedObjects.getTypeRegistry().getType(DASHBOARD_TYPE) !== undefined;
  const getClient = () => new SavedObjectsClient(savedObjects.createInternalRepository());

  const getInstalledVersion = async (): Promise<number | undefined> => {
    try {
      const { attributes } = await getClient().get<{ version?: number }>(
        DASHBOARD_TYPE,
        dashboardId,
        { namespace: soNamespace }
      );
      return attributes.version ?? 0;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  };

  return {
    install: async () => {
      if (!isDashboardTypeRegistered()) {
        logger.debug('Dashboard saved object type is not registered; skipping dashboard install');
        return;
      }
      const installedVersion = await getInstalledVersion();
      if (installedVersion !== undefined && installedVersion >= SYSTEM_EVENTS_DASHBOARD_VERSION) {
        return;
      }

      const client = getClient();
      const result = await savedObjects.createImporter(client).import({
        readStream: Readable.from([buildSystemEventsDashboard(namespace)]),
        overwrite: true,
        createNewCopies: false,
        managed: true,
        namespace: soNamespace,
        refresh: false,
      });
      result.warnings.forEach((warning) =>
        logger.warn(`System events dashboard import warning: ${JSON.stringify(warning)}`)
      );
      if (!result.success) {
        const [firstError] = result.errors ?? [];
        throw new Error(
          `Couldn't import the system events dashboard: ${JSON.stringify(firstError?.error)}`
        );
      }
      logger.debug(`Installed system events dashboard ${dashboardId}`);
    },

    uninstall: async () => {
      if (!isDashboardTypeRegistered()) {
        return;
      }
      try {
        await getClient().delete(DASHBOARD_TYPE, dashboardId, {
          namespace: soNamespace,
          force: true,
        });
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
          throw error;
        }
      }
    },
  };
};
