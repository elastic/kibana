import { initLeadfootCommand } from './leadfoot_command';
import { createRemoteInterceptors } from './interceptors';

export async function RemoteProvider({ getService }) {
  const lifecycle = getService('lifecycle');
  const config = getService('config');
  const log = getService('log');

  const { command } = await initLeadfootCommand({
    log,
    lifecycle,
    tunnelConfig: config.get('servers.webdriver'),
  });

  const interceptors = createRemoteInterceptors(command);

  log.info('Remote initialized');

  return new Proxy({}, {
    get(obj, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // prevent the remote from being treated like a promise by
        // hiding it's promise-like properties
        return undefined;
      }

      if (interceptors.hasOwnProperty(prop)) {
        return interceptors[prop];
      }

      return command[prop];
    }
  });
}
