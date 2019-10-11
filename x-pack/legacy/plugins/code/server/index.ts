/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as constants from '../common/constants';
import { CodePlugin } from './plugin';
import { PluginSetupContract } from '../../../../plugins/code/server/index';

export const codePlugin = (initializerContext: PluginSetupContract) =>
  new CodePlugin(initializerContext);

export { constants };
