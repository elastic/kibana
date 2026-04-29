/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SIZE, MIN_SIZE } from '../types';

/** Return true if the provided size is out of range */
export const sizeIsOutOfRange = (size?: number): boolean =>
  size == null || size < MIN_SIZE || size > MAX_SIZE;
