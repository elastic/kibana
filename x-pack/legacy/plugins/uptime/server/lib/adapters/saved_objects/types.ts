/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsQueryFn } from '../framework';
import { UMDynamicSettingsType } from '../../sources';

export interface UMSavedObjectsAdapter {
  getUptimeIndexPattern: UMSavedObjectsQueryFn;
  getUptimeSourceSettings: UMSavedObjectsQueryFn<UMDynamicSettingsType>;
  setUptimeSourceSettings: UMSavedObjectsQueryFn<void, UMDynamicSettingsType>;
}
