/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaultsDeep } from 'lodash';
import Boom from 'boom';

import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';

/**
 *  Service that provides access to the UiSettings stored in elasticsearch.
 *  @class UiSettingsService
 */
export class UiSettingsService {
  /**
   *  @constructor
   *  @param {Object} options
   *  @property {string} options.type type of SavedConfig object
   *  @property {string} options.id id of SavedConfig object
   *  @property {number} options.buildNum
   *  @property {SavedObjectsClient} options.savedObjectsClient
   *  @property {Function} [options.getDefaults]
   *  @property {Function} [options.log]
   */
  constructor(options) {
    const {
      type,
      id,
      buildNum,
      savedObjectsClient,
      // we use a function for getDefaults() so that defaults can be different in
      // different scenarios, and so they can change over time
      getDefaults = () => ({}),
      // function that accepts log messages in the same format as server.log
      log = () => {},
      overrides = {},
    } = options;

    this._type = type;
    this._id = id;
    this._buildNum = buildNum;
    this._savedObjectsClient = savedObjectsClient;
    this._getDefaults = getDefaults;
    this._overrides = overrides;
    this._log = log;
  }

  async getDefaults() {
    return await this._getDefaults();
  }

  // returns a Promise for the value of the requested setting
  async get(key) {
    const all = await this.getAll();
    return all[key];
  }

  async getAll() {
    const raw = await this.getRaw();

    return Object.keys(raw)
      .reduce((all, key) => {
        const item = raw[key];
        const hasUserValue = 'userValue' in item;
        all[key] = hasUserValue ? item.userValue : item.value;
        return all;
      }, {});
  }

  async getRaw() {
    const userProvided = await this.getUserProvided();
    return defaultsDeep(userProvided, await this.getDefaults());
  }

  async getUserProvided(options) {
    const userProvided = {};

    // write the userValue for each key stored in the saved object that is not overridden
    for (const [key, userValue] of Object.entries(await this._read(options))) {
      if (userValue !== null && !this.isOverridden(key)) {
        userProvided[key] = {
          userValue
        };
      }
    }

    // write all overridden keys, dropping the userValue is override is null and
    // adding keys for overrides that are not in saved object
    for (const [key, userValue] of Object.entries(this._overrides)) {
      userProvided[key] = userValue === null
        ? { isOverridden: true }
        : { isOverridden: true, userValue };
    }

    return userProvided;
  }

  async setMany(changes) {
    await this._write({ changes });
  }

  async set(key, value) {
    await this.setMany({ [key]: value });
  }

  async remove(key) {
    await this.set(key, null);
  }

  async removeMany(keys) {
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    await this.setMany(changes);
  }

  isOverridden(key) {
    return this._overrides.hasOwnProperty(key);
  }

  assertUpdateAllowed(key) {
    if (this.isOverridden(key)) {
      throw Boom.badRequest(`Unable to update "${key}" because it is overridden`);
    }
  }

  async _write({ changes, autoCreateOrUpgradeIfMissing = true }) {
    for (const key of Object.keys(changes)) {
      this.assertUpdateAllowed(key);
    }

    try {
      await this._savedObjectsClient.update(this._type, this._id, changes);
    } catch (error) {
      const { isNotFoundError } = this._savedObjectsClient.errors;
      if (!isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this._savedObjectsClient,
        version: this._id,
        buildNum: this._buildNum,
        log: this._log,
      });

      await this._write({
        changes,
        autoCreateOrUpgradeIfMissing: false
      });
    }
  }

  async _read(options = {}) {
    const {
      ignore401Errors = false
    } = options;

    const {
      isNotFoundError,
      isForbiddenError,
      isEsUnavailableError,
      isNotAuthorizedError
    } = this._savedObjectsClient.errors;

    const isIgnorableError = error => (
      isForbiddenError(error) ||
      isEsUnavailableError(error) ||
      (ignore401Errors && isNotAuthorizedError(error))
    );

    try {
      const resp = await this._savedObjectsClient.get(this._type, this._id);
      return resp.attributes;
    } catch (error) {
      if (isNotFoundError(error)) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig({
          savedObjectsClient: this._savedObjectsClient,
          version: this._id,
          buildNum: this._buildNum,
          log: this._log,
          onWriteError(error, attributes) {
            if (isNotAuthorizedError(error) || isForbiddenError(error)) {
              return attributes;
            }

            throw error;
          }
        });

        if (!failedUpgradeAttributes) {
          return await this._read(options);
        }

        return failedUpgradeAttributes;
      }

      if (isIgnorableError(error)) {
        return {};
      }

      throw error;
    }
  }
}
