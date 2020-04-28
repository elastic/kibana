/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CertStateThresholdsType = t.type({
  age: t.number,
  expiration: t.number,
});

export const DynamicSettingsType = t.type({
  heartbeatIndices: t.string,
  certThresholds: CertStateThresholdsType,
});

export const DynamicSettingsSaveType = t.intersection([
  t.type({
    success: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type DynamicSettings = t.TypeOf<typeof DynamicSettingsType>;
export type DynamicSettingsSaveResponse = t.TypeOf<typeof DynamicSettingsSaveType>;
export type CertStateThresholds = t.TypeOf<typeof CertStateThresholdsType>;
