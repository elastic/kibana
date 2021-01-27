/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EsArchiver } from '@kbn/es-archiver';
import { FtrProviderContext } from '../ftr_provider_context';

// @ts-ignore not TS yet
import * as KibanaServer from './kibana_server';

export function EsArchiverProvider({ getService }: FtrProviderContext): EsArchiver {
  const config = getService('config');
  const client = getService('legacyEs');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  if (!config.get('esArchiver')) {
    throw new Error(`esArchiver can't be used unless you specify it's config in your config file`);
  }

  const dataDir = config.get('esArchiver.directory');

  const esArchiver = new EsArchiver({
    client,
    dataDir,
    log,
    kbnClient: kibanaServer,
  });

  KibanaServer.extendEsArchiver({
    esArchiver,
    kibanaServer,
    retry,
    defaults: config.get('uiSettings.defaults'),
  });

  return esArchiver;
}
