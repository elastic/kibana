import { initLeadfootCommand } from './leadfoot_command';
import { createRemoteInterceptors } from './interceptors';
import { BrowserDriverApi } from './browser_driver_api';

export async function RemoteProvider({ getService }) {
  const lifecycle = getService('lifecycle');
  const config = getService('config');
  const log = getService('log');
  const possibleBrowsers = ['chrome', 'firefox'];
  const browserType = process.env.TEST_BROWSER_TYPE || 'chrome';

  if (!possibleBrowsers.includes(browserType)) {
    throw new Error(`Unexpected TEST_BROWSER_TYPE "${browserType}". Valid options are ` +  possibleBrowsers.join(','));
  }

  const browserDriverApi = await BrowserDriverApi.factory(log, config.get(browserType + 'driver.url'), browserType);
  lifecycle.on('cleanup', async () => await browserDriverApi.stop());

  await browserDriverApi.start();

  const { command } = await initLeadfootCommand({ log, browserDriverApi: browserDriverApi });
  const interceptors = createRemoteInterceptors(command);

  log.info('Remote initialized');

  lifecycle.on('beforeTests', async () => {
    // hard coded default, can be overriden per suite using `remote.setWindowSize()`
    // and will be automatically reverted after each suite
    await command.setWindowSize(1600, 1000);
  });

  const windowSizeStack = [];
  lifecycle.on('beforeTestSuite', async () => {
    windowSizeStack.unshift(await command.getWindowSize());
  });

  lifecycle.on('afterTestSuite', async () => {
    const { width, height } = windowSizeStack.shift();
    await command.setWindowSize(width, height);
  });

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
