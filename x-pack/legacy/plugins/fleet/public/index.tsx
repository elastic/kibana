/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter } from 'react-router-dom';
import { BASE_PATH } from '../common/constants';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/types';
import { AppRoutes } from './routes';

async function startApp(libs: FrontendLibs) {
  libs.framework.renderUIAtPath(
    BASE_PATH,
    <HashRouter basename="/fleet">
      <AppRoutes libs={libs} />
    </HashRouter>,
    'self'
  );

  await libs.framework.waitUntilFrameworkReady();
}

startApp(compose());
