/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';

import * as constants from '../common/constants';
import { CodePlugin } from './plugin';

export const codePlugin = (initializerContext: PluginInitializerContext) =>
  new CodePlugin(initializerContext);
export { constants };
