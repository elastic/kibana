import { ChromedriverApi } from './chromedriver_api';

export function createRemoteChromedriverApi(log, url) {
  return new ChromedriverApi({
    url,

    start() {
      log.info(`Reusing instance at %j`, url);
    }

  });
}
