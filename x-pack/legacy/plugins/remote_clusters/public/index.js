/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin as RemoteClustersPlugin } from './plugin';
import { createShim } from './shim';

const { coreStart, pluginsStart } = createShim();
const remoteClustersPlugin = new RemoteClustersPlugin();
remoteClustersPlugin.start(coreStart, pluginsStart);
