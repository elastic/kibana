/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './index.scss';

import { BackgroundSessionExamplePlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new BackgroundSessionExamplePlugin();
}
export { BackgroundSessionExamplePluginSetup, BackgroundSessionExamplePluginStart } from './types';
