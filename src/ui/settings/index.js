import { defaultsDeep } from 'lodash';
import defaultsProvider from './defaults';
import Bluebird from 'bluebird';

export default function setupSettings(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');

  if (!config.get('uiSettings.enabled')) {
    status.disabled('uiSettings.enabled config is set to `false`');
    return;
  }

  const uiSettings = {
    // returns a Promise for the value of the requested setting
    get,
    // returns a Promise for a hash of setting key/value pairs
    getAll,
    // .set(key, value), returns a Promise for persisting the new value to ES
    set,
    // takes a key/value hash, returns a Promise for persisting the new values to ES
    setMany,
    // returns a Promise for removing the provided key from user-specific settings
    remove,
    // takes an array, returns a Promise for removing every provided key from user-specific settings
    removeMany,

    // returns a Promise for the default settings, follows metadata format (see ./defaults)
    getDefaults,
    // returns a Promise for user-specific settings stored in ES, follows metadata format
    getUserProvided,
    // returns a Promise merging results of getDefaults & getUserProvided, follows metadata format
    getRaw
  };

  server.decorate('server', 'uiSettings', () => uiSettings);
  kbnServer.ready().then(mirrorEsStatus);

  async function get(req, key) {
    assertRequest(req);
    return getAll(req).then(all => all[key]);
  }

  async function getAll(req) {
    assertRequest(req);
    return getRaw(req)
    .then(raw => Object.keys(raw)
      .reduce((all, key) => {
        const item = raw[key];
        const hasUserValue = 'userValue' in item;
        all[key] = hasUserValue ? item.userValue : item.value;
        return all;
      }, {})
    );
  }

  async function getRaw(req) {
    assertRequest(req);
    return Promise
      .all([getDefaults(), getUserProvided(req)])
      .then(([defaults, user]) => defaultsDeep(user, defaults));
  }

  function getDefaults() {
    return Promise.resolve(defaultsProvider());
  }

  async function getUserProvided(req, { ignore401Errors = false } = {}) {
    assertRequest(req);
    const { callWithRequest, errors } = server.plugins.elasticsearch.getCluster('admin');

    // If the ui settings status isn't green, we shouldn't be attempting to get
    // user settings, since we can't be sure that all the necessary conditions
    // (e.g. elasticsearch being available) are met.
    if (status.state !== 'green') {
      return hydrateUserSettings({});
    }

    const params = getClientSettings(config);
    const allowedErrors = [errors[404], errors[403], errors.NoConnections];
    if (ignore401Errors) allowedErrors.push(errors[401]);

    return Bluebird.resolve(callWithRequest(req, 'get', params, { wrap401Errors: !ignore401Errors }))
      .catch(...allowedErrors, () => ({}))
      .then(resp => resp._source || {})
      .then(source => hydrateUserSettings(source));
  }

  async function setMany(req, changes) {
    assertRequest(req);
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    const clientParams = {
      ...getClientSettings(config),
      body: { doc: changes }
    };
    return callWithRequest(req, 'update', clientParams)
      .then(() => ({}));
  }

  async function set(req, key, value) {
    assertRequest(req);
    return setMany(req, { [key]: value });
  }

  async function remove(req, key) {
    assertRequest(req);
    return set(req, key, null);
  }

  async function removeMany(req, keys) {
    assertRequest(req);
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    return setMany(req, changes);
  }

  function mirrorEsStatus() {
    const esStatus = kbnServer.status.getForPluginId('elasticsearch');

    if (!esStatus) {
      status.red('UI Settings requires the elasticsearch plugin');
      return;
    }

    copyStatus();
    esStatus.on('change', copyStatus);

    function copyStatus() {
      const { state } = esStatus;
      const statusMessage = state === 'green' ? 'Ready' : `Elasticsearch plugin is ${state}`;
      status[state](statusMessage);
    }
  }
}

function hydrateUserSettings(user) {
  return Object.keys(user).reduce(expand, {});
  function expand(expanded, key) {
    const userValue = user[key];
    if (userValue !== null) {
      expanded[key] = { userValue };
    }
    return expanded;
  }
}

function getClientSettings(config) {
  const index = config.get('kibana.index');
  const id = config.get('pkg.version');
  const type = 'config';
  return { index, type, id };
}

function assertRequest(req) {
  if (
    typeof req === 'object' &&
    typeof req.path === 'string' &&
    typeof req.headers === 'object'
  ) return;

  throw new TypeError('all uiSettings methods must be passed a hapi.Request object');
}
