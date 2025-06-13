/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsClientContract, SavedObjectsUpdateOptions } from '@kbn/core/server';

import { normalizeHostsForAgents } from '../../common/services';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, GLOBAL_SETTINGS_ID } from '../../common/constants';
import type { Settings, BaseSettings } from '../../common/types';
import type { SettingsSOAttributes } from '../types';

import { DeleteUnenrolledAgentsPreconfiguredError } from '../errors';

import { appContextService } from './app_context';
import { listFleetServerHosts } from './fleet_server_host';
import { auditLoggingService } from './audit_logging';

export async function getSettings(soClient: SavedObjectsClientContract): Promise<Settings> {
  const res = await soClient.find<SettingsSOAttributes>({
    type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });
  auditLoggingService.writeCustomSoAuditLog({
    action: 'get',
    id: GLOBAL_SETTINGS_ID,
    savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });

  if (res.total === 0) {
    throw Boom.notFound('Global settings not found');
  }
  const settingsSo = res.saved_objects[0];
  const fleetServerHosts = await listFleetServerHosts(soClient);

  return {
    id: settingsSo.id,
    version: settingsSo.version,
    ...settingsSo.attributes,
    fleet_server_hosts: fleetServerHosts.items.flatMap((item) => item.host_urls),
    preconfigured_fields: getConfigFleetServerHosts() ? ['fleet_server_hosts'] : [],
    delete_unenrolled_agents: settingsSo.attributes.delete_unenrolled_agents,
  };
}

export async function getSettingsOrUndefined(
  soClient: SavedObjectsClientContract
): Promise<Settings | undefined> {
  try {
    return await getSettings(soClient);
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return undefined;
    }

    throw e;
  }
}

export async function settingsSetup(soClient: SavedObjectsClientContract) {
  try {
    const config = appContextService.getConfig();
    const settings = await getSettings(soClient);
    if (config?.prereleaseEnabledByDefault && !settings.prerelease_integrations_enabled) {
      await saveSettings(soClient, {
        prerelease_integrations_enabled: config?.prereleaseEnabledByDefault,
      });
    }
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();
      return saveSettings(soClient, defaultSettings);
    }

    throw e;
  }
}

export async function saveSettings(
  soClient: SavedObjectsClientContract,
  newData: Partial<Omit<Settings, 'id'>>,
  options?: SavedObjectsUpdateOptions<SettingsSOAttributes> & {
    createWithOverwrite?: boolean;
    fromSetup?: boolean;
  }
): Promise<Partial<Settings> & Pick<Settings, 'id'>> {
  const data = { ...newData };
  if (data.fleet_server_hosts) {
    data.fleet_server_hosts = data.fleet_server_hosts.map(normalizeHostsForAgents);
  }
  const { createWithOverwrite, ...updateOptions } = options ?? {};

  try {
    const settings = await getSettings(soClient);

    if (
      !options?.fromSetup &&
      settings.delete_unenrolled_agents?.is_preconfigured &&
      data.delete_unenrolled_agents
    ) {
      throw new DeleteUnenrolledAgentsPreconfiguredError(
        `Setting delete_unenrolled_agents is preconfigured as 'enableDeleteUnenrolledAgents' and cannot be updated outside of kibana config file.`
      );
    }

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: settings.id,
      savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    });

    const res = await soClient.update<SettingsSOAttributes>(
      GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      settings.id,
      data,
      updateOptions
    );

    return {
      id: settings.id,
      ...res.attributes,
    };
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();

      auditLoggingService.writeCustomSoAuditLog({
        action: 'create',
        id: GLOBAL_SETTINGS_ID,
        savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });

      const res = await soClient.create<SettingsSOAttributes>(
        GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        {
          ...defaultSettings,
          ...data,
        },
        {
          id: GLOBAL_SETTINGS_ID,
          // Do not overwrite if version is passed
          overwrite: typeof createWithOverwrite === 'undefined' ? true : createWithOverwrite,
        }
      );

      return {
        id: res.id,
        ...res.attributes,
      };
    }

    throw e;
  }
}

function getConfigFleetServerHosts() {
  const config = appContextService.getConfig();
  return config?.agents?.fleet_server?.hosts && config.agents.fleet_server.hosts.length > 0
    ? config?.agents?.fleet_server?.hosts
    : undefined;
}

export function createDefaultSettings(): BaseSettings {
  const config = appContextService.getConfig();
  return { prerelease_integrations_enabled: !!config?.prereleaseEnabledByDefault };
}
