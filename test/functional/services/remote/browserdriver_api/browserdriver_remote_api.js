import { BrowserdriverApi } from './browserdriver_api';

export function createRemoteBrowserdriverApi(log, url) {
  return new BrowserdriverApi({
    url,

    start() {
      log.info(`Reusing instance at %j`, url);
    }

  });
}
