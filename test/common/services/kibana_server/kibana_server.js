import { format as formatUrl } from 'url';

import { delay } from 'bluebird';

import { KibanaServerStatus } from './status';
import { KibanaServerUiSettings } from './ui_settings';
import { KibanaServerVersion } from './version';

export function KibanaServerProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const es = getService('es');

  class KibanaServer {
    constructor() {
      const url = formatUrl(config.get('servers.kibana'));
      this.status = new KibanaServerStatus(url);
      this.version = new KibanaServerVersion(this.status);
      this.uiSettings = new KibanaServerUiSettings(log, es, this.version);

      lifecycle.on('beforeEachTest', async () => {
        await this.waitForStabilization();
      });
    }

    async waitForStabilization() {
      const { status, uiSettings } = this;

      let firstCheck = true;
      const pingInterval = 500; // ping every 500 ms for an update
      const startMs = Date.now();
      const timeout = config.get('timeouts.kibanaStabilize');

      let exists;
      let state;

      while (true) {
        try {
          exists = await uiSettings.existInEs();
          state = await status.getOverallState();

          if (exists && state === 'green') {
            log.debug(`Kibana uiSettings are in elasticsearch and the server is reporting a green status`);
            return;
          }
        } catch (err) {
          log.warning(`Failed to check for kibana stabilization: ${err.stack}`);
        }

        if (Date.now() - startMs >= timeout) {
          break;
        }

        if (firstCheck) {
          // we only log once, and only if we failed the first check
          firstCheck = false;
          log.debug(`waiting up to ${timeout}ms for kibana to stabilize...`);
        }
        await delay(pingInterval);
      }

      const docState = exists ? 'exists' : `doesn't exist`;
      throw new Error(`Kibana never stabilized: config doc ${docState} and status is ${state}`);
    }
  }

  return new KibanaServer();
}
