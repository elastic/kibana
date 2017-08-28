import { defaultsDeep, noop } from 'lodash';

function hydrateUserSettings(userSettings) {
  return Object.keys(userSettings)
    .map(key => ({ key, userValue: userSettings[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

/**
 *  Service that provides access to the UiSettings stored in elasticsearch.
 *
 *  @class UiSettingsService
 *  @param {Object} options
 *  @property {string} options.index Elasticsearch index name where settings are stored
 *  @property {string} options.type type of ui settings Elasticsearch doc
 *  @property {string} options.id id of ui settings Elasticsearch doc
 *  @property {AsyncFunction} options.callCluster function that accepts a method name and
 *                            param object which causes a request via some elasticsearch client
 *  @property {AsyncFunction} [options.readInterceptor] async function that is called when the
 *                            UiSettingsService does a read() an has an oportunity to intercept the
 *                            request and return an alternate `_source` value to use.
 */
export class UiSettingsService {
  constructor(options) {
    const {
      type,
      id,
      savedObjectsClient,
      readInterceptor = noop,
      // we use a function for getDefaults() so that defaults can be different in
      // different scenarios, and so they can change over time
      getDefaults = () => ({}),
    } = options;

    this._savedObjectsClient = savedObjectsClient;
    this._getDefaults = getDefaults;
    this._readInterceptor = readInterceptor;
    this._type = type;
    this._id = id;
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
    await this._write(changes);
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

  async _write(changes) {
    await this._savedObjectsClient.update(this._type, this._id, changes);
  }

  async _read(options = {}) {
    const interceptValue = await this._readInterceptor(options);
    if (interceptValue != null) {
      return interceptValue;
    }

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
