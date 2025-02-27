/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type PluginInitializerContext,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type SavedObjectsClientContract,
  type Logger,
  SavedObjectsClient,
} from '@kbn/core/server';
import { OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID } from '@kbn/management-settings-ids';
import type { APMDataAccessConfig } from '../common/config_schema';
import { migrateLegacyAPMIndicesToSpaceAware } from './saved_objects/migrations/migrate_legacy_apm_indices_to_space_aware';
import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { uiSettings } from '../common/ui_settings';

export type ApmSourcesAccessPluginSetup = ReturnType<ApmSourcesAccessPlugin['setup']>;
export type ApmSourcesAccessPluginStart = ReturnType<ApmSourcesAccessPlugin['start']>;

export class ApmSourcesAccessPlugin
  implements Plugin<ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart>
{
  public config: APMDataAccessConfig;
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<APMDataAccessConfig>();
    this.logger = initContext.logger.get();
  }

  getApmIndices = async (savedObjectsClient: SavedObjectsClientContract) => {
    const apmIndicesFromSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...this.config.indices, ...apmIndicesFromSavedObject };
  };

  public setup(core: CoreSetup) {
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);
    core.uiSettings.register({
      [OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID]: {
        ...uiSettings[OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID],
        value: JSON.stringify(this.config.indices, null, 2),
      },
    });

    // expose
    return {
      apmIndicesFromConfigFile: this.config.indices,
      getApmIndices: this.getApmIndices,
    };
  }

  public async start(core: CoreStart) {
    // TODO: remove in 9.0
    try {
      await migrateLegacyAPMIndicesToSpaceAware({ coreStart: core, logger: this.logger });
    } catch (e) {
      this.logger.error('Failed to run migration making APM indices space aware');
      this.logger.error(e);
    }

    try {
      const soClient = core.savedObjects.createInternalRepository();
      const indices = await this.getApmIndices(soClient);
      const uiSettingsClient = core.uiSettings.asScopedToClient(new SavedObjectsClient(soClient));
      await uiSettingsClient.set(
        OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID,
        JSON.stringify(indices, null, 2)
      );
    } catch (e) {
      this.logger.error(e);
    }

    return {
      getApmIndices: this.getApmIndices,
    };
  }

  public stop() {}
}
