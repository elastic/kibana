/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  RulesSettings,
  RulesSettingsModificationMetadata,
  RulesSettingsAlertDeletion,
  RulesSettingsAlertDeletionProperties,
} from '../../../common';
import {
  DEFAULT_ALERT_DELETION_SETTINGS,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { alertDeletionSchema } from '../schemas';

export interface RulesSettingsAlertDeletionClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;
}

export class RulesSettingsAlertDeletionClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;

  constructor(options: RulesSettingsAlertDeletionClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getModificationMetadata = options.getModificationMetadata;
  }

  public async get(): Promise<RulesSettingsAlertDeletion> {
    const rulesSettings = await this.getOrCreate();
    if (!rulesSettings.attributes.alertDeletion) {
      this.logger.error('Failed to get alert deletion rules setting for current space.');
      throw new Error(
        'Failed to get alert deletion rules setting for current space. Alert deletion settings are undefined'
      );
    }
    return rulesSettings.attributes.alertDeletion;
  }

  public async update(newAlertDeletionProperties: RulesSettingsAlertDeletionProperties) {
    return await retryIfConflicts(
      this.logger,
      'ruleSettingsClient.alertDeletion.update()',
      async () => await this.updateWithOCC(newAlertDeletionProperties)
    );
  }

  private async updateWithOCC(newAlertDeletionProperties: RulesSettingsAlertDeletionProperties) {
    try {
      alertDeletionSchema.validate(newAlertDeletionProperties);
    } catch (e) {
      this.logger.error(
        `Failed to verify new alert deletion settings properties when updating. Error: ${e}`
      );
      throw e;
    }

    const { attributes, version } = await this.getOrCreate();
    if (!attributes.alertDeletion) {
      throw new Error('Existing alert deletion settings are undefined');
    }

    const modificationMetadata = await this.getModificationMetadata();
    try {
      const result = await this.savedObjectsClient.update(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
        {
          alertDeletion: {
            ...attributes.alertDeletion,
            ...newAlertDeletionProperties,
            updatedAt: modificationMetadata.updatedAt,
            updatedBy: modificationMetadata.updatedBy,
          },
        },
        {
          version,
        }
      );

      if (!result.attributes.alertDeletion) {
        throw new Error('Alert deletion settings after update are undefined');
      }
      return result.attributes.alertDeletion;
    } catch (e) {
      const errorMessage = 'savedObjectsClient errored trying to update alert deletion settings';
      this.logger.error(`${errorMessage}: ${e}`);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  private async getSettings(): Promise<SavedObject<RulesSettings>> {
    return await this.savedObjectsClient.get<RulesSettings>(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID
    );
  }

  private async createSettings(): Promise<SavedObject<RulesSettings>> {
    const modificationMetadata = await this.getModificationMetadata();
    const defaultAlertDeletionSettings = DEFAULT_ALERT_DELETION_SETTINGS;
    try {
      return await this.savedObjectsClient.create<RulesSettings>(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        {
          alertDeletion: {
            ...defaultAlertDeletionSettings,
            ...modificationMetadata,
          },
        },
        {
          id: RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
          overwrite: true,
        }
      );
    } catch (e) {
      this.logger.error(
        `Failed to create alert deletion rules setting for current space. Error: ${e}`
      );
      throw e;
    }
  }

  /**
   * Helper function to ensure that a rules-settings saved object always exists.
   * Ensures the creation of the saved object is done lazily during retrieval.
   */
  private async getOrCreate(): Promise<SavedObject<RulesSettings>> {
    try {
      return await this.getSettings();
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.logger.info('Creating new default alert deletion rules settings for current space.');
        return await this.createSettings();
      }
      this.logger.error(
        `Failed to get alert deletion rules setting for current space. Error: ${e}`
      );
      throw e;
    }
  }
}
