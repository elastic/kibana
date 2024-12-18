/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  RulesSettings,
  RulesSettingsModificationMetadata,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
  RulesSettingsQueryDelayProperties,
  MIN_QUERY_DELAY,
  MAX_QUERY_DELAY,
  RulesSettingsQueryDelay,
  DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS,
  DEFAULT_QUERY_DELAY_SETTINGS,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { queryDelaySchema } from '../schemas';

const verifyQueryDelaySettings = (settings: RulesSettingsQueryDelayProperties) => {
  const { delay } = settings;

  if (delay < MIN_QUERY_DELAY || delay > MAX_QUERY_DELAY) {
    throw Boom.badRequest(
      `Invalid query delay value, must be between ${MIN_QUERY_DELAY} and ${MAX_QUERY_DELAY}, but got: ${delay}.`
    );
  }
};

export interface RulesSettingsQueryDelayClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly isServerless: boolean;
  readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;
}

export class RulesSettingsQueryDelayClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly isServerless: boolean;
  private readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;

  constructor(options: RulesSettingsQueryDelayClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.isServerless = options.isServerless;
    this.getModificationMetadata = options.getModificationMetadata;
  }

  public async get(): Promise<RulesSettingsQueryDelay> {
    const rulesSettings = await this.getOrCreate();
    if (!rulesSettings.attributes.queryDelay) {
      this.logger.error('Failed to get query delay rules setting for current space.');
      throw new Error(
        'Failed to get query delay rules setting for current space. Query delay settings are undefined'
      );
    }
    return rulesSettings.attributes.queryDelay;
  }

  public async update(newQueryDelayProperties: RulesSettingsQueryDelayProperties) {
    return await retryIfConflicts(
      this.logger,
      'ruleSettingsClient.queryDelay.update()',
      async () => await this.updateWithOCC(newQueryDelayProperties)
    );
  }

  private async updateWithOCC(newQueryDelayProperties: RulesSettingsQueryDelayProperties) {
    try {
      queryDelaySchema.validate(newQueryDelayProperties);
      verifyQueryDelaySettings(newQueryDelayProperties);
    } catch (e) {
      this.logger.error(
        `Failed to verify new query delay settings properties when updating. Error: ${e}`
      );
      throw e;
    }

    const { attributes, version } = await this.getOrCreate();
    if (!attributes.queryDelay) {
      throw new Error('Query delay settings are undefined');
    }

    const modificationMetadata = await this.getModificationMetadata();
    try {
      const result = await this.savedObjectsClient.update(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
        {
          queryDelay: {
            ...attributes.queryDelay,
            ...newQueryDelayProperties,
            updatedAt: modificationMetadata.updatedAt,
            updatedBy: modificationMetadata.updatedBy,
          },
        },
        {
          version,
        }
      );

      if (!result.attributes.queryDelay) {
        throw new Error('Query delay settings are undefined');
      }
      return result.attributes.queryDelay;
    } catch (e) {
      const errorMessage = 'savedObjectsClient errored trying to update query delay settings';
      this.logger.error(`${errorMessage}: ${e}`);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  private async getSettings(): Promise<SavedObject<RulesSettings>> {
    return await this.savedObjectsClient.get<RulesSettings>(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID
    );
  }

  private async createSettings(): Promise<SavedObject<RulesSettings>> {
    const modificationMetadata = await this.getModificationMetadata();
    const defaultQueryDelaySettings = this.isServerless
      ? DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS
      : DEFAULT_QUERY_DELAY_SETTINGS;
    try {
      return await this.savedObjectsClient.create<RulesSettings>(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        {
          queryDelay: {
            ...defaultQueryDelaySettings,
            ...modificationMetadata,
          },
        },
        {
          id: RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
          overwrite: true,
        }
      );
    } catch (e) {
      this.logger.error(
        `Failed to create query delay rules setting for current space. Error: ${e}`
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
        this.logger.info('Creating new default query delay rules settings for current space.');
        return await this.createSettings();
      }
      this.logger.error(`Failed to get query delay rules setting for current space. Error: ${e}`);
      throw e;
    }
  }
}
