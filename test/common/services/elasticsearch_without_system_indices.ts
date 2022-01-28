/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format as formatUrl } from 'url';
import fs from 'fs';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { CA_CERT_PATH } from '@kbn/dev-utils';

import { FtrProviderContext } from '../ftr_provider_context';

/*
 registers Kibana-specific @elastic/elasticsearch client instance.
 */
export function ElasticsearchWithoutSystemIndicesProvider({
  getService,
}: FtrProviderContext): Client {
  const config = getService('config');

  if (process.env.TEST_CLOUD) {
    return new Client({
      nodes: [formatUrl(config.get('servers.elasticsearch'))],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      Connection: HttpConnection,
    });
  } else {
    return new Client({
      tls: {
        ca: fs.readFileSync(CA_CERT_PATH, 'utf-8'),
      },
      nodes: [formatUrl(config.get('servers.elasticsearch'))],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      Connection: HttpConnection,
    });
  }
}
