/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin as MlPlugin } from './plugin';
import { createPublicShim } from './shim';

const { core, plugins } = createPublicShim();
const mlPlugin = new MlPlugin();
mlPlugin.setup(core, plugins);
mlPlugin.start(core, plugins);
