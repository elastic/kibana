/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { UnitConfigHooks, UnitValidationResult } from './types';

/**
 * Delegates unit validation to `hooks.validate` (config-distributor
 * `POST /v1/validate`). Kibana does not schema-check the unit document at all.
 */
export const validateUnitForWrite = async (
  unit: StreamsUnit.Configuration,
  hooks: UnitConfigHooks = {}
): Promise<UnitValidationResult> => {
  return (await hooks.validate?.(unit)) ?? {};
};
