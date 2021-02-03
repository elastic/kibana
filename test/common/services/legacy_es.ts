/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { format as formatUrl } from 'url';

import * as legacyElasticsearch from 'elasticsearch';

import { DEFAULT_API_VERSION } from '../../../src/core/server/elasticsearch/elasticsearch_config';
import { FtrProviderContext } from '../ftr_provider_context';

export function LegacyEsProvider({ getService }: FtrProviderContext): legacyElasticsearch.Client {
  const config = getService('config');

  return new legacyElasticsearch.Client({
    apiVersion: DEFAULT_API_VERSION,
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
  });
}
