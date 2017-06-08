import { defaultsDeep, noop } from 'lodash';
import Bluebird from 'bluebird';
import { errors as esErrors } from 'elasticsearch';

import { getDefaultSettings } from './defaults';

function hydrateUserSettings(userSettings) {
  return Object.keys(userSettings)
    .map(key => ({ key, userValue: userSettings[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

export class UiSettingsService {
  constructor(options = {}) {
    const {
      index,
      type,
      id,
      callCluster,
      readInterceptor = noop,
    } = options;

    this._callCluster = callCluster;
    this._readInterceptor = readInterceptor;
    this._index = index;
    this._type = type;
    this._id = id;
  }

  getDefaults() {
    return getDefaultSettings();
  }

  // returns a Promise for the value of the requested setting
  get(key) {
    return this.getAll()
      .then(all => all[key]);
  }

  getAll() {
    return this.getRaw()
      .then(raw => Object.keys(raw)
        .reduce((all, key) => {
          const item = raw[key];
          const hasUserValue = 'userValue' in item;
          all[key] = hasUserValue ? item.userValue : item.value;
          return all;
        }, {})
      );
  }

  getRaw() {
    return this.getUserProvided()
      .then(user => defaultsDeep(user, this.getDefaults()));
  }

  async getUserProvided(options) {
    return hydrateUserSettings(await this._read(options));
  }

  async _read(options = {}) {
    const interceptValue = await this._readInterceptor(options);
    if (interceptValue != null) {
      return interceptValue;
    }

    const {
      ignore401Errors = false
    } = options;

    const params = this._getClientSettings();
    const allowedErrors = [
      esErrors[404],
      esErrors[403],
      esErrors.NoConnections
    ];

    if (ignore401Errors) {
      allowedErrors.push(esErrors[401]);
    }

    return Bluebird
      .resolve(this._callCluster('get', params, { wrap401Errors: !ignore401Errors }))
      .catch(...allowedErrors, () => ({}))
      .then(resp => resp._source || {});
  }

  setMany(changes) {
    const clientParams = {
      ...this._getClientSettings(),
      body: { doc: changes }
    };

    return this._callCluster('update', clientParams)
      .then(() => ({}));
  }

  set(key, value) {
    return this.setMany({ [key]: value });
  }

  remove(key) {
    return this.set(key, null);
  }

  removeMany(keys) {
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    return this.setMany(changes);
  }

  _getClientSettings() {
    return {
      index: this._index,
      type: this._type,
      id: this._id
    };
  }
}
