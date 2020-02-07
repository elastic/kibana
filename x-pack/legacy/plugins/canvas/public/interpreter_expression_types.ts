/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { typesRegistry } from '../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { typeFunctions } from '../canvas_plugin_src/expression_types';

typeFunctions.forEach(r => {
  typesRegistry.register(r);
});
