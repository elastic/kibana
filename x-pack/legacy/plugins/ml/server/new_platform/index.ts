/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, MlInitializerContext } from './plugin';

export function plugin(initializerContext: MlInitializerContext) {
  return new Plugin(initializerContext);
}
