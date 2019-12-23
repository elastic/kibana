/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, CoreStart } from 'kibana/public';

let npSetup: CoreSetup;
let npStart: CoreStart;

export function registerSetupSingleton(setup: CoreSetup) {
  npSetup = setup;
}

export function registerStartSingleton(start: CoreStart) {
  npStart = start;
}

export { npSetup, npStart };
