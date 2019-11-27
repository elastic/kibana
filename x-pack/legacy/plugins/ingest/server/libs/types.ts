/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackendFrameworkLib } from './framework';
import { PolicyLib } from './policy';
import { ESDatabaseAdapter } from './adapters/es_database/default';
import { OutputsLib } from './outputs';
import { DatasourcesLib } from './datasources';
export interface ServerLibs {
  outputs: OutputsLib;
  datasources: DatasourcesLib;
  policy: PolicyLib;
  framework: BackendFrameworkLib;
  database?: ESDatabaseAdapter;
}
