/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin as TransformPlugin } from './plugin';
import { createShim } from './shim';

const { core, plugins } = createShim();
const transformPlugin = new TransformPlugin();
transformPlugin.start(core, plugins);
