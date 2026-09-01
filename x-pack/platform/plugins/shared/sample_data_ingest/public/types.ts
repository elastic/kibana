/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';
import type { InstallationAPI } from './services/installation';

export interface SampleDataIngestPluginSetup {}

export interface SampleDataIngestPluginStart
  extends Pick<InstallationAPI, 'install' | 'getStatus'> {
  isSampleIndex: (indexName: string) => boolean;
  minimumLicenseType: LicenseType;
}
