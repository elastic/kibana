import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function SupertestProvider({ getService }) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  return supertestAsPromised(kibanaServerUrl);
}
