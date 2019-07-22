/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapters/database/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { BackendFrameworkLib } from './framework';
export interface ServerLibs {
  framework: BackendFrameworkLib;
  database?: DatabaseAdapter;
}
