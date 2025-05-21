/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataQualityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataQualityPluginStart {}

export interface AppPluginSetupDependencies {
  management: ManagementSetup;
  share: SharePluginSetup;
}

export interface AppPluginStartDependencies {
  datasetQuality: DatasetQualityPluginStart;
  management: ManagementStart;
  share: SharePluginStart;
}
