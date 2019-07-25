/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackendFrameworkLib } from './framework';
import { ConfigurationLib } from './configuration';
import { ESDatabaseAdapter } from './adapters/es_database/default';
export interface ServerLibs {
  configuration: ConfigurationLib;
  framework: BackendFrameworkLib;
  database?: ESDatabaseAdapter;
}
