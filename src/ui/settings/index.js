import { defaultsDeep, partial } from 'lodash';
import defaultsProvider from './defaults';

export default function setupSettings(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');
  const uiSettings = {
    getAll,
    getDefaults,
    getUserProvided,
    set,
    setMany,
    remove
  };

  server.decorate('server', 'uiSettings', () => uiSettings);
  kbnServer.ready().then(mirrorEsStatus);

  function getAll() {
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
