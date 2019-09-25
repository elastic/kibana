/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'react-vis/dist/style.css';
import 'ui/angular-bootstrap';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import 'ui/courier';
import 'ui/persisted_log';
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';
import { UMFrontendLibs } from '../lib/lib';
import { UptimeApp } from '../uptime_app';

export async function startApp(libs: UMFrontendLibs) {
  libs.framework.render(UptimeApp, createApolloClient);
}
