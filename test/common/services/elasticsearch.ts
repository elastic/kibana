/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format as formatUrl } from 'url';
import fs from 'fs';
import { Client } from '@elastic/elasticsearch';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';

import { systemIndicesSuperuser } from '@kbn/test';
import { FtrProviderContext } from '../ftr_provider_context';

/*
 registers Kibana-specific @elastic/elasticsearch client instance.
 */
export function ElasticsearchProvider({ getService }: FtrProviderContext): KibanaClient {
  const config = getService('config');

  const esUrl = formatUrl({
    ...config.get('servers.elasticsearch'),
    // Use system indices user so tests can write to system indices
    auth: `${systemIndicesSuperuser.username}:${systemIndicesSuperuser.password}`,
  });

  if (process.env.TEST_CLOUD) {
    return new Client({
      nodes: [esUrl],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
    });
  } else {
    return new Client({
      ssl: {
        ca: fs.readFileSync(CA_CERT_PATH, 'utf-8'),
      },
      nodes: [esUrl],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
    });
  }
}
