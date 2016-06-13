import { defaultsDeep, partial } from 'lodash';
import defaultsProvider from './defaults';

export default function setupSettings(kbnServer, server, config) {
  const uiSettings = {
    getAll,
    getDefaults,
    getUserProvided,
    set,
    setMany,
    remove
  };

  server.decorate('server', 'uiSettings', () => uiSettings);

  function getAll() {
    return Promise
      .all([getDefaults(), getUserProvided()])
      .then(([defaults, user]) => defaultsDeep(user, defaults));
  }

  function getDefaults() {
    return Promise.resolve(defaultsProvider());
  }

  function userSettingsNotFound(kibanaVersion) {
    if (server.plugins.elasticsearch.status.state === 'green') {
      server.plugins.kibana.status.red(`Could not find user-provided settings for this version of Kibana (${kibanaVersion})`);
    } else {
      server.log(['warning', 'settings'], 'User-provided settings were requested before the Kibana index was ready');
    }
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
