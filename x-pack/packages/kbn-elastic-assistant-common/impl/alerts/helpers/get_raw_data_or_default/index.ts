/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRawDataValid } from '../is_raw_data_valid';
import type { MaybeRawData } from '../types';

/** Returns the raw data if it valid, or a default if it's not */
export const getRawDataOrDefault = (rawData: MaybeRawData): Record<string, unknown[]> =>
  isRawDataValid(rawData) ? rawData : {};
