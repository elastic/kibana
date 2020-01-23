/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from './libs/compose/kibana';
import { initRestApi } from './routes/init_api';
import { shim } from './shim';

export const initServerWithKibana = (hapiServer: any) => {
  const {
    pluginsStart,
    // pluginsSetup
  } = shim(hapiServer);
  const libs = compose(hapiServer, pluginsStart);

  // TODO enable when this is fixed https://github.com/elastic/kibana/pull/42762
  // pluginsSetup.encryptedSavedObjects.registerType({
  //   type: 'outputs',
  //   attributesToEncrypt: new Set(['admin_username', 'admin_password']),
  // });
  initRestApi(hapiServer, libs);
};
