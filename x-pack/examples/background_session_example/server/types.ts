/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancedDataPluginStart } from '../../../plugins/data_enhanced/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BackgroundSessionExamplePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BackgroundSessionExamplePluginStart {}

export interface BackgroundSessionExamplePluginStartDeps {
  dataEnhanced: EnhancedDataPluginStart;
}
