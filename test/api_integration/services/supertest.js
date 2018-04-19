import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function KibanaSupertestProvider({ getService }) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  return supertestAsPromised(kibanaServerUrl);
}

export function ElasticsearchSupertestProvider({ getService }) {
  const config = getService('config');
  const elasticSearchServerUrl = formatUrl(config.get('servers.elasticsearch'));
  return supertestAsPromised(elasticSearchServerUrl);
}
