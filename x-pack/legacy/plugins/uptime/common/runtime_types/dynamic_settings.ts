/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const DynamicSettingsType = t.type({
  heartbeatIndexName: t.string,
});

export const DynamicSettingsSaveType = t.type({
  success: t.boolean,
  error: t.string,
  settings: DynamicSettingsType,
});

export type DynamicSettings = t.TypeOf<typeof DynamicSettingsType>;
export type DynamicSettingsSaveResponse = t.TypeOf<typeof DynamicSettingsSaveType>;
