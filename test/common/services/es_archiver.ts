/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { format as formatUrl } from 'url';
import { FtrProviderContext } from '../ftr_provider_context';

import { EsArchiver } from '../../../src/es_archiver';
// @ts-ignore not TS yet
import * as KibanaServer from './kibana_server';

export function EsArchiverProvider({ getService, hasService }: FtrProviderContext): EsArchiver {
  const config = getService('config');
  const client = getService('legacyEs');
  const log = getService('log');

  if (!config.get('esArchiver')) {
    throw new Error(`esArchiver can't be used unless you specify it's config in your config file`);
  }

  const dataDir = config.get('esArchiver.directory');

  const esArchiver = new EsArchiver({
    client,
    dataDir,
    log,
    kibanaUrl: formatUrl(config.get('servers.kibana')),
  });

  if (hasService('kibanaServer')) {
    KibanaServer.extendEsArchiver({
      esArchiver,
      kibanaServer: getService('kibanaServer'),
      retry: getService('retry'),
      defaults: config.get('uiSettings.defaults'),
    });
  }

  return esArchiver;
}
