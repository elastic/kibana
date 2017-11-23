import { format as formatUrl } from 'url';

import { KibanaServerStatus } from './status';
import { KibanaServerUiSettings } from './ui_settings';
import { KibanaServerVersion } from './version';

export async function KibanaServerProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');

  return new class KibanaServer {
    constructor() {
      const url = formatUrl(config.get('servers.kibana'));
      this.status = new KibanaServerStatus(url);
      this.version = new KibanaServerVersion(this.status);
      this.uiSettings = new KibanaServerUiSettings(url, log, this.version);
    }
  };
}
