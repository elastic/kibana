import { BrowserDriverApi } from './browser_driver_api';

export function createRemoteBrowserDriverApi(log, url) {
  return new BrowserDriverApi({
    url,

    start() {
      log.info(`Reusing instance at %j`, url);
    }

  });
}
