/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { resolveKibanaPath } from '@kbn/plugin-helpers';

export const KIBANA_SCRIPT_PATH = resolveKibanaPath('scripts/kibana');
export const KIBANA_ROOT = resolveKibanaPath('');
export const XPACK_KIBANA_ROOT = resolve(KIBANA_ROOT, 'x-pack');
export const GULP_COMMAND_PATH = resolve(XPACK_KIBANA_ROOT, 'node_modules/.bin/gulp');
export const KIBANA_FTR_SCRIPT = resolve(KIBANA_ROOT, 'scripts/functional_test_runner');
export const PROJECT_ROOT = resolve(__dirname, '../../../');
export const FTR_CONFIG_PATH = resolve(PROJECT_ROOT, 'test/functional/config');
export const OPTIMIZE_BUNDLE_DIR = resolve(KIBANA_ROOT, 'optimize/xpackTestUiServer');
