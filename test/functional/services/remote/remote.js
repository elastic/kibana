import { initLeadfootCommand } from './leadfoot_command';
import { createRemoteInterceptors } from './interceptors';
import { ChromedriverApi } from './chromedriver_api';

export async function RemoteProvider({ getService }) {
  const lifecycle = getService('lifecycle');
  const config = getService('config');
  const log = getService('log');

  const chromedriverApi = await ChromedriverApi.factory(log, config.get('chromedriver.url'));
  lifecycle.on('cleanup', async () => await chromedriverApi.stop());

  await chromedriverApi.start();

  const { command } = await initLeadfootCommand({ log, chromedriverApi });
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
