/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESDatabaseAdapter } from './adapters/es_database/default';
import { DatasourcesLib } from './datasources';
import { BackendFrameworkLib } from './framework';
import { OutputsLib } from './outputs';
import { PolicyLib } from './policy';

export interface ServerLibs {
  outputs: OutputsLib;
  datasources: DatasourcesLib;
  policy: PolicyLib;
  framework: BackendFrameworkLib;
  database?: ESDatabaseAdapter;
}
