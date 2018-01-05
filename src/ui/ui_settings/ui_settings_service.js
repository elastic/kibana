import { defaultsDeep } from 'lodash';
import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';

function hydrateUserSettings(userSettings) {
  return Object.keys(userSettings)
    .map(key => ({ key, userValue: userSettings[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

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
    } = options;

    this._type = type;
    this._id = id;
    this._buildNum = buildNum;
    this._savedObjectsClient = savedObjectsClient;
    this._getDefaults = getDefaults;
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
    return hydrateUserSettings(await this._read(options));
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

  async _write({ changes, autoCreateOrUpgradeIfMissing = true }) {
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
      isNotFoundError(error) ||
      isForbiddenError(error) ||
      isEsUnavailableError(error) ||
      (ignore401Errors && isNotAuthorizedError(error))
    );

    try {
      const resp = await this._savedObjectsClient.get(this._type, this._id);
      return resp.attributes;
    } catch (error) {
      if (isIgnorableError(error)) {
        return {};
      }

      throw error;
    }
  }
}
