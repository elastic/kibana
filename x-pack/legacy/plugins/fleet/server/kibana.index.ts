/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from './libs/compose/kibana';
import { initRestApi } from './routes/init_api';

export const initServerWithKibana = (hapiServer: any) => {
  const libs = compose(hapiServer);
  initRestApi(hapiServer, libs);
};
