import { defaultsDeep, partial } from 'lodash';
import defaultsProvider from './defaults';

export default function setupSettings(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');
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

  function get(key) {
    return getAll().then(all => all[key]);
  }

  function getAll() {
    return getRaw()
    .then(raw => Object.keys(raw)
      .reduce((all, key) => {
        const item = raw[key];
        const hasUserValue = 'userValue' in item;
        all[key] = hasUserValue ? item.userValue : item.value;
        return all;
      }, {})
    );
  }

  function getRaw() {
    return Promise
      .all([getDefaults(), getUserProvided()])
      .then(([defaults, user]) => defaultsDeep(user, defaults));
  }

  function getDefaults() {
    return Promise.resolve(defaultsProvider());
  }

  function userSettingsNotFound(kibanaVersion) {
    status.red(`Could not find user-provided settings for Kibana ${kibanaVersion}`);
    return {};
  }

  function getUserProvided() {
    const { client } = server.plugins.elasticsearch;
    const clientSettings = getClientSettings(config);
    return client
      .get({ ...clientSettings })
      .then(res => res._source)
      .catch(partial(userSettingsNotFound, clientSettings.id))
      .then(user => hydrateUserSettings(user));
  }

  function setMany(changes) {
    const { client } = server.plugins.elasticsearch;
    const clientSettings = getClientSettings(config);
    return client
      .update({
        ...clientSettings,
        body: { doc: changes }
      })
      .then(() => ({}));
  }

  function set(key, value) {
    return setMany({ [key]: value });
  }

  function remove(key) {
    return set(key, null);
  }

  function removeMany(keys) {
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    return setMany(changes);
  }

  function mirrorEsStatus() {
    const esStatus = kbnServer.status.getForPluginId('elasticsearch');

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
