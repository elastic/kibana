/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from './libs/compose/kibana';
import { initRestApi } from './rest_api/init_api';

export const initServerWithKibana = (hapiServer: any) => {
  const libs = compose(hapiServer);
  libs.framework.log(['debug'], 'Ingest is composed -- debug message');
  libs.framework.expose('policy', libs.policy);
  libs.framework.expose('outputs', libs.outputs);

  initRestApi(hapiServer, libs);
};

export async function postInit(server: any) {
  await Promise.all([
    server.plugins.ingest.policy.ensureDefaultPolicy(),
    server.plugins.ingest.outputs.ensureDefaultOutput(),
  ]).catch(err => {
    // Log error but do not stop kbn from booting
    server.log(['error'], err);
  });
}
