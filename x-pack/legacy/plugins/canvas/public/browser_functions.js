/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionsRegistry } from 'plugins/interpreter/registries';
import { functions } from '../canvas_plugin_src/functions/browser';

functions.forEach(fn => {
  functionsRegistry.register(fn);
});

export default functions;
