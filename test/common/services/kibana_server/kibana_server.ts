/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import { KbnClient } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

export function KibanaServerProvider({ getService }: FtrProviderContext): KbnClient {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const url = Url.format(config.get('servers.kibana'));
  const defaults = config.get('uiSettings.defaults');
  const kbn = new KbnClient({
    log,
    url,
    certificateAuthorities: config.get('servers.kibana.certificateAuthorities'),
    uiSettingDefaults: defaults,
    importExportDir: config.get('kbnArchiver.directory'),
  });

  if (defaults) {
    lifecycle.beforeTests.add(async () => {
      await kbn.uiSettings.update(defaults);
    });
  }

  return kbn;
}
