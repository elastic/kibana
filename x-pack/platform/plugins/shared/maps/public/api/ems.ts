/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EMSTermJoinConfig, SampleValuesConfig } from '../ems_autosuggest';

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: SampleValuesConfig
): Promise<EMSTermJoinConfig | null> {
  const { suggestEMSTermJoinConfig: suggestEms } = await import('../ems_autosuggest');
  return await suggestEms(sampleValuesConfig);
}
