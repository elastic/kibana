/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFtrConfigFile } from '@kbn/plugin-helpers';

import { FTR_CONFIG_PATH } from './paths';
import { log } from './log';

export async function getFtrConfig() {
  return await readFtrConfigFile(log, FTR_CONFIG_PATH);
}
