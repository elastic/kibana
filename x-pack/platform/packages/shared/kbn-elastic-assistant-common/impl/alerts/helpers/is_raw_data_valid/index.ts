/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaybeRawData } from '../types';

export const isRawDataValid = (rawData: MaybeRawData): rawData is Record<string, unknown[]> =>
  typeof rawData === 'object' && Object.keys(rawData).every((x) => Array.isArray(rawData[x]));
