import { format as formatUrl } from 'url';

import elasticsearch from 'elasticsearch';

export function EsProvider({ getService }) {
  const config = getService('config');

  return new elasticsearch.Client({
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
  });
}
