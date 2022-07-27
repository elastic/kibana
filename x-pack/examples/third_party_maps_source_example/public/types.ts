/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { MapsPluginSetup, MapsPluginStart } from '@kbn/maps-plugin/public/plugin';

export interface MapsCustomRasterSourcePluginSetup {
  developerExamples: DeveloperExamplesSetup;
  maps: MapsPluginSetup;
}
export interface MapsCustomRasterSourcePluginStart {
  maps: MapsPluginStart;
}
