/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsArchiver } from '@kbn/es-archiver';
import { FtrProviderContext } from '../ftr_provider_context';
import * as KibanaServer from '../../common/services/kibana_server';

export function EsArchiverProvider({ getService }: FtrProviderContext): EsArchiver {
  const config = getService('config');
  const client = getService('es');

  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  const esArchiver = new EsArchiver({
    client,
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
