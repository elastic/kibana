/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppCore, AppPlugins } from '../../shim';
export { AppCore, AppPlugins } from '../../shim';

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export interface AppState {
  [key: string]: any;
}
