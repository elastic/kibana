import { defaultsDeep } from 'lodash';
import Bluebird from 'bluebird';

import { getDefaultSettings } from './defaults';

function hydrateUserSettings(user) {
  return Object.keys(user)
    .map(key => ({ key, userValue: user[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

function assertRequest(req) {
  if (
    !req ||
    typeof req !== 'object' ||
    typeof req.path !== 'string' ||
    !req.headers ||
    typeof req.headers !== 'object'
  ) {
    throw new TypeError('all uiSettings methods must be passed a hapi.Request object');
  }
}

export class UiSettings {
  constructor(server, status) {
    this._server = server;
    this._status = status;
  }

  getDefaults() {
    return getDefaultSettings();
  }

  // returns a Promise for the value of the requested setting
  async get(req, key) {
    assertRequest(req);
    return this.getAll(req)
      .then(all => all[key]);
  }

  async getAll(req) {
    assertRequest(req);
    return this.getRaw(req)
      .then(raw => Object.keys(raw)
        .reduce((all, key) => {
          const item = raw[key];
          const hasUserValue = 'userValue' in item;
          all[key] = hasUserValue ? item.userValue : item.value;
          return all;
        }, {})
      );
  }

  async getRaw(req) {
    assertRequest(req);
    return this.getUserProvided(req)
      .then(user => defaultsDeep(user, this.getDefaults()));
  }

  async getUserProvided(req, { ignore401Errors = false } = {}) {
    assertRequest(req);
    const { callWithRequest, errors } = this._server.plugins.elasticsearch.getCluster('admin');

    // If the ui settings status isn't green, we shouldn't be attempting to get
    // user settings, since we can't be sure that all the necessary conditions
    // (e.g. elasticsearch being available) are met.
    if (this._status.state !== 'green') {
      return hydrateUserSettings({});
    }

    const params = this._getClientSettings();
    const allowedErrors = [errors[404], errors[403], errors.NoConnections];
    if (ignore401Errors) allowedErrors.push(errors[401]);

    return Bluebird
      .resolve(callWithRequest(req, 'get', params, { wrap401Errors: !ignore401Errors }))
      .catch(...allowedErrors, () => ({}))
      .then(resp => resp._source || {})
      .then(source => hydrateUserSettings(source));
  }

  async setMany(req, changes) {
    assertRequest(req);
    const { callWithRequest } = this._server.plugins.elasticsearch.getCluster('admin');
    const clientParams = {
      ...this._getClientSettings(),
      body: { doc: changes }
    };
    return callWithRequest(req, 'update', clientParams)
      .then(() => ({}));
  }

  async set(req, key, value) {
    assertRequest(req);
    return this.setMany(req, { [key]: value });
  }

  async remove(req, key) {
    assertRequest(req);
    return this.set(req, key, null);
  }

  async removeMany(req, keys) {
    assertRequest(req);
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    return this.setMany(req, changes);
  }

  _getClientSettings() {
    const config = this._server.config();
    const index = config.get('kibana.index');
    const id = config.get('pkg.version');
    const type = 'config';
    return { index, type, id };
  }
}
