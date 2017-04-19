import { format as formatUrl } from 'url';

import elasticsearch from 'elasticsearch';

export function EsProvider({ getService }) {
  const config = getService('config');
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');
  console.log('elasticsearch url', formatUrl(config.get('servers.elasticsearch')));
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');
  console.log('=============================');

  return new elasticsearch.Client({
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
  });
}
