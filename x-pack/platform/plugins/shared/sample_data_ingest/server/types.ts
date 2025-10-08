/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SampleDataManager } from './services/sample_data_manager';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface SampleDataSetupDependencies {}

export interface SampleDataStartDependencies {}

export interface InternalServices {
  logger: Logger;
  sampleDataManager: SampleDataManager;
}
