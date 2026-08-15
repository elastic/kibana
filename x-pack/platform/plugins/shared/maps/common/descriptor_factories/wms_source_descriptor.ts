/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';
import type { WMSSourceDescriptor } from '../descriptor_types';

export function createWmsSourceDescriptor(
  descriptor: Partial<WMSSourceDescriptor>
): WMSSourceDescriptor {
  return {
    type: SOURCE_TYPES.WMS,
    ...descriptor,
  } as WMSSourceDescriptor;
}
